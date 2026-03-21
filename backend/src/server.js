require("dotenv").config();
const os = require("os");
const app = require("./app");

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";

function getLocalNetworkAddress() {
  const interfaces = os.networkInterfaces();

  for (const networkInterface of Object.values(interfaces)) {
    for (const address of networkInterface || []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

app.listen(PORT, HOST, () => {
  const localNetworkAddress = getLocalNetworkAddress();

  console.log(`Server running at http://localhost:${PORT}`);

  if (localNetworkAddress) {
    console.log(`Server reachable on your local network at http://${localNetworkAddress}:${PORT}`);
  }
});
