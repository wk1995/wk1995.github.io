package com.wk1995.usbandroidcamera

import java.io.BufferedOutputStream
import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class MjpegServer(
    private val port: Int = 8081,
    private val onSwitchCamera: () -> Unit
) {
    private val running = AtomicBoolean(false)
    private val latestFrame = AtomicReference<ByteArray?>(null)
    private val clients = CopyOnWriteArrayList<Socket>()
    private val executor = Executors.newCachedThreadPool()
    private var serverSocket: ServerSocket? = null
    private val frameLock = Object()

    fun start() {
        if (!running.compareAndSet(false, true)) return

        executor.execute {
            try {
                serverSocket = ServerSocket(port, 16, InetAddress.getByName("127.0.0.1"))
                while (running.get()) {
                    val socket = serverSocket?.accept() ?: break
                    clients.add(socket)
                    executor.execute { handleClient(socket) }
                }
            } catch (_: IOException) {
                stop()
            }
        }
    }

    fun stop() {
        running.set(false)
        try {
            serverSocket?.close()
        } catch (_: IOException) {
        }
        clients.forEach { socket ->
            try {
                socket.close()
            } catch (_: IOException) {
            }
        }
        clients.clear()
        synchronized(frameLock) {
            frameLock.notifyAll()
        }
    }

    fun updateFrame(frame: ByteArray) {
        latestFrame.set(frame)
        synchronized(frameLock) {
            frameLock.notifyAll()
        }
    }

    fun isRunning(): Boolean = running.get()

    private fun handleClient(socket: Socket) {
        socket.soTimeout = 0

        try {
            val input = socket.getInputStream().bufferedReader()
            val requestLine = input.readLine() ?: return
            while (true) {
                val line = input.readLine() ?: break
                if (line.isEmpty()) break
            }

            when {
                requestLine.startsWith("GET /stream") -> writeStream(socket)
                requestLine.startsWith("GET /snapshot") -> writeSnapshot(socket)
                requestLine.startsWith("POST /switch") || requestLine.startsWith("GET /switch") -> {
                    onSwitchCamera()
                    writeJson(socket, 200, """{"ok":true}""")
                }
                requestLine.startsWith("GET /health") -> writeJson(
                    socket,
                    200,
                    """{"ok":true,"running":${running.get()},"hasFrame":${latestFrame.get() != null}}"""
                )
                else -> writeJson(socket, 404, """{"ok":false,"error":"not_found"}""")
            }
        } catch (_: IOException) {
        } finally {
            clients.remove(socket)
            try {
                socket.close()
            } catch (_: IOException) {
            }
        }
    }

    private fun writeStream(socket: Socket) {
        val boundary = "usbandroidcamera"
        val output = BufferedOutputStream(socket.getOutputStream())
        output.write(
            (
                "HTTP/1.1 200 OK\r\n" +
                    "Connection: close\r\n" +
                    "Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n" +
                    "Pragma: no-cache\r\n" +
                    "Content-Type: multipart/x-mixed-replace; boundary=$boundary\r\n\r\n"
                ).toByteArray()
        )
        output.flush()

        var lastFrame: ByteArray? = null
        while (running.get() && !socket.isClosed) {
            val frame = waitForNextFrame(lastFrame)
            if (frame == null) continue
            lastFrame = frame

            output.write(
                (
                    "--$boundary\r\n" +
                        "Content-Type: image/jpeg\r\n" +
                        "Content-Length: ${frame.size}\r\n\r\n"
                    ).toByteArray()
            )
            output.write(frame)
            output.write("\r\n".toByteArray())
            output.flush()
        }
    }

    private fun waitForNextFrame(previous: ByteArray?): ByteArray? {
        var frame = latestFrame.get()
        if (frame != null && frame !== previous) return frame

        synchronized(frameLock) {
            try {
                frameLock.wait(1500)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
            }
        }

        frame = latestFrame.get()
        return if (frame !== previous) frame else null
    }

    private fun writeSnapshot(socket: Socket) {
        val frame = latestFrame.get()
        if (frame == null) {
            writeJson(socket, 503, """{"ok":false,"error":"no_frame"}""")
            return
        }

        val output = BufferedOutputStream(socket.getOutputStream())
        output.write(
            (
                "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: image/jpeg\r\n" +
                    "Content-Length: ${frame.size}\r\n" +
                    "Cache-Control: no-store\r\n\r\n"
                ).toByteArray()
        )
        output.write(frame)
        output.flush()
    }

    private fun writeJson(socket: Socket, status: Int, json: String) {
        val statusText = if (status == 200) "OK" else "Error"
        val body = json.toByteArray()
        val output = BufferedOutputStream(socket.getOutputStream())
        output.write(
            (
                "HTTP/1.1 $status $statusText\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Content-Length: ${body.size}\r\n" +
                    "Cache-Control: no-store\r\n\r\n"
                ).toByteArray()
        )
        output.write(body)
        output.flush()
    }
}

