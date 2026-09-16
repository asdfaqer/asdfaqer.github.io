import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import argparse

# Path to Math Reasoning Autoencoder repo
AUTOENCODER_DIR = r"D:\Math Reasoning Autoencoder"
if os.path.exists(AUTOENCODER_DIR) and AUTOENCODER_DIR not in sys.path:
    sys.path.append(AUTOENCODER_DIR)

# Global variables for model state
AE_MODEL_LOADED = False
AE_DEVICE = "cpu"

try:
    import torch
    from visualize import load_model_on_demand, generate_sample_data, CHECKPOINT_INFO
    
    if torch.cuda.is_available():
        AE_DEVICE = "cuda"
    print(f"[PORTFOLIO BACKEND] Initializing Autoencoder on device: {AE_DEVICE}...")
    AE_MODEL_LOADED = load_model_on_demand()
    print(f"[PORTFOLIO BACKEND] Discrete Autoencoder Model Loaded: {AE_MODEL_LOADED}")
except Exception as e:
    print(f"[PORTFOLIO BACKEND WARNING] Failed to preload autoencoder: {e}")
    generate_sample_data = None


class PortfolioHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            status_data = {
                "status": "online" if AE_MODEL_LOADED else "offline",
                "model": "SmallCascadingMemoryAutoencoder",
                "device": AE_DEVICE,
                "codebook_size": 16384,
                "checkpoint": "joint_discrete_epoch_15.pt",
                "max_length": 64
            }
            self.wfile.write(json.dumps(status_data).encode("utf-8"))
            return

        elif path.startswith("/api/sample"):
            if generate_sample_data is None:
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Autoencoder backend not available"}).encode("utf-8"))
                return

            model_id = query.get("model_id", [None])[0]
            split = query.get("split", ["custom" if "custom_text" in query else "val"])[0]
            custom_text = query.get("custom_text", [""])[0]
            mode = query.get("mode", ["target_acc"])[0]
            
            try:
                target_acc = float(query.get("target_acc", [0.90])[0])
            except Exception:
                target_acc = 0.90
                
            try:
                drop_k = int(query.get("drop_k", [0])[0])
            except Exception:
                drop_k = 0

            try:
                data = generate_sample_data(
                    model_id=model_id,
                    split=split,
                    custom_text=custom_text if custom_text else None,
                    mode=mode,
                    target_acc=target_acc,
                    drop_k=drop_k
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # Default: Serve static files from workspace root
        return super().do_GET()


def main():
    parser = argparse.ArgumentParser(description="Fengtao Wang Portfolio & Real AI Backend Server")
    parser.add_argument("--port", type=int, default=8080, help="Port to serve on (default: 8080)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface (default: 0.0.0.0)")
    args = parser.parse_args()

    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, PortfolioHandler)
    print(f"[PORTFOLIO BACKEND] Serving Website & Real AI API at http://localhost:{args.port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[PORTFOLIO BACKEND] Shutting down...")
        httpd.server_close()


if __name__ == "__main__":
    main()
