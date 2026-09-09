using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace DPRServer
{
    class Program
    {
        private static int port = 3000;
        private static string rootDir = AppDomain.CurrentDomain.BaseDirectory;
        private static string localIp = "127.0.0.1";

        private static Dictionary<string, string> mimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" },
            { ".htm",  "text/html; charset=utf-8" },
            { ".css",  "text/css; charset=utf-8" },
            { ".js",   "application/javascript; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".png",  "image/png" },
            { ".jpg",  "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".ico",  "image/x-icon" },
            { ".svg",  "image/svg+xml" }
        };

        static void Main(string[] args)
        {
            Console.Title = "DPR Mobile Pro Server";
            localIp = GetLocalIPv4();

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=======================================================");
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("       DPR MOBILE PRO - HIGH SPEED LOCAL SERVER        ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=======================================================");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(" [PC / Laptop]   : http://localhost:" + port);
            Console.WriteLine(" [Mobile Phone]  : http://" + localIp + ":" + port);
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("-------------------------------------------------------");
            Console.WriteLine(" 1. Make sure phone and laptop are on same Wi-Fi");
            Console.WriteLine(" 2. Scan on-screen QR code or open Mobile Phone URL");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=======================================================\n");
            Console.ResetColor();

            TcpListener listener = new TcpListener(IPAddress.Any, port);
            listener.Server.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);

            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Error starting on port " + port + ": " + ex.Message);
                Console.ResetColor();
                return;
            }

            // Auto-open browser on PC
            try
            {
                System.Diagnostics.Process.Start("http://localhost:" + port);
            }
            catch { }

            while (true)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    Task.Run(() => HandleClient(client));
                }
                catch (Exception ex)
                {
                    // Server shutting down
                    break;
                }
            }
        }

        private static void HandleClient(TcpClient client)
        {
            using (client)
            {
                try
                {
                    NetworkStream stream = client.GetStream();
                    StreamReader reader = new StreamReader(stream, Encoding.UTF8);

                    string requestLine = reader.ReadLine();
                    if (string.IsNullOrEmpty(requestLine)) return;

                    // Read remaining HTTP request headers until empty line
                    string headerLine;
                    while (!string.IsNullOrEmpty(headerLine = reader.ReadLine()))
                    {
                        // consume headers
                    }

                    string[] parts = requestLine.Split(' ');
                    if (parts.Length < 2) return;

                    string url = parts[1].Split('?')[0].Split('#')[0];
                    if (url == "/" || string.IsNullOrEmpty(url)) url = "/index.html";

                    // API endpoint for dynamic Wi-Fi IP detection
                    if (url.Equals("/api/network-ip", StringComparison.OrdinalIgnoreCase))
                    {
                        string json = string.Format("{{\"ip\":\"{0}\",\"port\":{1},\"url\":\"http://{0}:{1}\"}}", localIp, port);
                        byte[] body = Encoding.UTF8.GetBytes(json);
                        string resHeader = string.Format("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {0}\r\nConnection: close\r\n\r\n", body.Length);
                        byte[] hBytes = Encoding.ASCII.GetBytes(resHeader);
                        stream.Write(hBytes, 0, hBytes.Length);
                        stream.Write(body, 0, body.Length);
                        stream.Flush();
                        return;
                    }

                    string filePath = Path.Combine(rootDir, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

                    if (File.Exists(filePath))
                    {
                        string ext = Path.GetExtension(filePath);
                        string contentType = "application/octet-stream";
                        if (mimeTypes.ContainsKey(ext))
                        {
                            contentType = mimeTypes[ext];
                        }

                        byte[] fileBytes = File.ReadAllBytes(filePath);
                        string resHeader = string.Format("HTTP/1.1 200 OK\r\nContent-Type: {0}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {1}\r\nConnection: close\r\n\r\n", contentType, fileBytes.Length);
                        byte[] hBytes = Encoding.ASCII.GetBytes(resHeader);
                        stream.Write(hBytes, 0, hBytes.Length);
                        stream.Write(fileBytes, 0, fileBytes.Length);
                        stream.Flush();
                    }
                    else
                    {
                        byte[] notFound = Encoding.UTF8.GetBytes("File Not Found");
                        string resHeader = string.Format("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: {0}\r\nConnection: close\r\n\r\n", notFound.Length);
                        byte[] hBytes = Encoding.ASCII.GetBytes(resHeader);
                        stream.Write(hBytes, 0, hBytes.Length);
                        stream.Write(notFound, 0, notFound.Length);
                        stream.Flush();
                    }
                }
                catch
                {
                    // Client disconnected
                }
            }
        }

        private static string GetLocalIPv4()
        {
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus == OperationalStatus.Up && 
                        (ni.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 || ni.NetworkInterfaceType == NetworkInterfaceType.Ethernet))
                    {
                        foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip.Address))
                            {
                                return ip.Address.ToString();
                            }
                        }
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }
    }
}
