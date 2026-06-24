package com.wk1995.usbandroidcamera

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Size
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var switchButton: Button
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var mjpegServer: MjpegServer

    private var lensFacing = CameraSelector.LENS_FACING_BACK
    private var streaming = false
    private var lastFrameAt = 0L
    private var pendingAutoStart = false

    private val targetFps = 12
    private val jpegQuality = 70
    private val targetSize = Size(1280, 720)

    private val requestPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            bindCamera()
        } else {
            setStatus("Camera permission denied")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingAutoStart = intent.getBooleanExtra("autoStart", false)
        setContentView(R.layout.activity_main)

        previewView = findViewById(R.id.previewView)
        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        switchButton = findViewById(R.id.switchButton)
        cameraExecutor = Executors.newSingleThreadExecutor()
        mjpegServer = MjpegServer(8081) {
            runOnUiThread { switchCamera() }
        }

        startButton.setOnClickListener {
            if (streaming) stopStream() else startStream()
        }

        switchButton.setOnClickListener {
            switchCamera()
        }

        if (hasCameraPermission()) {
            bindCamera()
        } else {
            requestPermission.launch(Manifest.permission.CAMERA)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra("autoStart", false)) {
            pendingAutoStart = true
            if (hasCameraPermission()) {
                bindCamera()
            }
        }
    }

    override fun onDestroy() {
        stopStream()
        cameraExecutor.shutdown()
        super.onDestroy()
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun startStream() {
        mjpegServer.start()
        streaming = true
        startButton.text = "Stop stream"
        setStatus("Streaming on phone localhost:8081. Use adb forward tcp:8081 tcp:8081 on Windows.")
    }

    private fun stopStream() {
        streaming = false
        mjpegServer.stop()
        startButton.text = "Start stream"
        setStatus("Stream stopped")
    }

    private fun switchCamera() {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }
        bindCamera()
    }

    private fun bindCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            val cameraProvider = providerFuture.get()
            val cameraSelector = CameraSelector.Builder()
                .requireLensFacing(lensFacing)
                .build()

            val resolutionSelector = ResolutionSelector.Builder()
                .setAspectRatioStrategy(AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
                .setResolutionStrategy(
                    ResolutionStrategy(
                        targetSize,
                        ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                    )
                )
                .build()

            val preview = Preview.Builder()
                .setResolutionSelector(resolutionSelector)
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setResolutionSelector(resolutionSelector)
                .build()

            analysis.setAnalyzer(cameraExecutor) { image ->
                try {
                    val now = System.currentTimeMillis()
                    val minFrameIntervalMs = 1000L / targetFps
                    if (streaming && now - lastFrameAt >= minFrameIntervalMs) {
                        lastFrameAt = now
                        val jpeg = ImageConverters.imageProxyToJpeg(
                            image,
                            jpegQuality,
                            image.imageInfo.rotationDegrees
                        )
                        mjpegServer.updateFrame(jpeg)
                    }
                } catch (error: Throwable) {
                    runOnUiThread { setStatus("Frame encode error: ${error.message}") }
                } finally {
                    image.close()
                }
            }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, analysis)
                setStatus("Camera ready: ${if (lensFacing == CameraSelector.LENS_FACING_BACK) "back" else "front"}")
                maybeAutoStart()
            } catch (error: Throwable) {
                setStatus("Bind camera failed: ${error.message}")
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun maybeAutoStart() {
        if (pendingAutoStart && !streaming) {
            pendingAutoStart = false
            startStream()
        }
    }

    private fun setStatus(message: String) {
        statusText.text = message
    }
}
