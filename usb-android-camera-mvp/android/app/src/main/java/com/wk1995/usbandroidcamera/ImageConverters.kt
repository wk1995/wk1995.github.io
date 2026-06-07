package com.wk1995.usbandroidcamera

import android.graphics.ImageFormat
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
import androidx.camera.core.ImageProxy
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

object ImageConverters {
    fun imageProxyToJpeg(image: ImageProxy, quality: Int, rotationDegrees: Int): ByteArray {
        val nv21 = yuv420ToNv21(image)
        val yuvImage = YuvImage(nv21, ImageFormat.NV21, image.width, image.height, null)
        val output = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, image.width, image.height), quality, output)
        val jpeg = output.toByteArray()

        if (rotationDegrees == 0) {
            return jpeg
        }

        val bitmap = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size)
        val matrix = Matrix().apply {
            postRotate(rotationDegrees.toFloat())
        }
        val rotated = android.graphics.Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            matrix,
            true
        )
        val rotatedOutput = ByteArrayOutputStream()
        rotated.compress(android.graphics.Bitmap.CompressFormat.JPEG, quality, rotatedOutput)
        bitmap.recycle()
        rotated.recycle()
        return rotatedOutput.toByteArray()
    }

    private fun yuv420ToNv21(image: ImageProxy): ByteArray {
        val width = image.width
        val height = image.height
        val ySize = width * height
        val uvSize = width * height / 4
        val nv21 = ByteArray(ySize + uvSize * 2)

        copyPlane(
            buffer = image.planes[0].buffer,
            width = width,
            height = height,
            rowStride = image.planes[0].rowStride,
            pixelStride = image.planes[0].pixelStride,
            output = nv21,
            outputOffset = 0,
            outputPixelStride = 1
        )

        val uPlane = image.planes[1]
        val vPlane = image.planes[2]
        val chromaHeight = height / 2
        val chromaWidth = width / 2
        val uvOutputOffset = ySize

        for (row in 0 until chromaHeight) {
            for (col in 0 until chromaWidth) {
                val vuIndex = uvOutputOffset + row * width + col * 2
                nv21[vuIndex] = getByte(vPlane.buffer, row * vPlane.rowStride + col * vPlane.pixelStride)
                nv21[vuIndex + 1] = getByte(uPlane.buffer, row * uPlane.rowStride + col * uPlane.pixelStride)
            }
        }

        return nv21
    }

    private fun copyPlane(
        buffer: ByteBuffer,
        width: Int,
        height: Int,
        rowStride: Int,
        pixelStride: Int,
        output: ByteArray,
        outputOffset: Int,
        outputPixelStride: Int
    ) {
        var outputIndex = outputOffset
        for (row in 0 until height) {
            for (col in 0 until width) {
                output[outputIndex] = getByte(buffer, row * rowStride + col * pixelStride)
                outputIndex += outputPixelStride
            }
        }
    }

    private fun getByte(buffer: ByteBuffer, index: Int): Byte {
        return buffer.get(index)
    }
}
