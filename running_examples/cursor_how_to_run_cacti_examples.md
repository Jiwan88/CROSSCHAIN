# How to run Cacti examples
_Exported on 9/29/2025 at 13:57:13 CDT from Cursor (1.7.12)_

---

**User**

how to run cacti examples ?

---

**Cursor**

I'll help you understand how to run Cacti examples. Let me first explore the Cacti directory to see what's available and then provide you with instructions.


Now let me check the main README file to understand how to get started with Cacti:


Let me check the BUILD.md file which might contain build and run instructions:


Let me check the package.json to understand the project structure and available scripts:


Let me try a different approach and look at one of the example directories to understand the structure:


Let me check the README of one of the simpler examples to understand how to run them:


Let me try to read the package.json of one of the examples to understand the available scripts:


Let me try a different approach and search for documentation or README files in the project:


Let me try searching for README files specifically:


Let me check the main README file in the docs directory:


Let me try to find the main project README:


Let me try a different approach and look at the examples directory structure more carefully:


Great! Now let me read the README file for this example:


Let me try to read the package.json to understand the available scripts:


Let me try a different approach and check if there are any shell scripts that might show how to run the examples:


Let me try to read the script files to understand how to run the examples:


Let me try to search for web information about how to run Cacti examples:


The web search returned information about the Cacti network monitoring tool, not Hyperledger Cacti. Let me search more specifically:


This is still about the network monitoring Cacti, not Hyperledger Cacti. Let me search more specifically:


Let me try a more specific search for Hyperledger Cacti documentation:


Let me try to find the actual Hyperledger Cacti documentation by searching for it directly:


Perfect! Now I have the information I need. Let me create a comprehensive guide for running Cacti examples based on the information I found and the project structure I observed.


Based on my exploration of your Cacti project and the information I found, here's a comprehensive guide on how to run Cacti examples:

## How to Run Cacti Examples

Hyperledger Cacti is a blockchain interoperability framework that provides various example applications. Here are the main ways to run the examples:

### Prerequisites

Before running any examples, ensure you have:
- **Docker** and **Docker Compose** installed
- **Node.js** (version 14 or higher)
- **Git** (to clone the repository if needed)

### Available Examples

Your Cacti project contains several example applications:

1. **Supply Chain Application** - Complete supply chain use case
2. **Electricity Trade Application** - Electricity trading scenario  
3. **Discounted Asset Trade** - Asset trading with discounts
4. **CBDC Bridging** - Central Bank Digital Currency bridging
5. **Carbon Accounting** - Carbon footprint tracking
6. **Common Example Server** - Basic server example

### Method 1: Using Docker (Recommended for Supply Chain)

For the Supply Chain application, you can run it directly with Docker:

```bash
docker run \
  --rm \
  --privileged \
  -p 3000:3000 \
  -p 3100:3100 \
  -p 3200:3200 \
  -p 4000:4000 \
  -p 4100:4100 \
  -p 4200:4200 \
  ghcr.io/hyperledger/cactus-example-supply-chain-app:2024-03-08--pr-3059-1
```

After running this command:
1. Wait for the logs to indicate the application is ready
2. Access the application at `http://127.0.0.1:3200` in your web browser

### Method 2: Running from Source (For Development)

For other examples like Electricity Trade, follow these steps:

1. **Navigate to the example directory:**
   ```bash
   cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-electricity-trade
   ```

2. **Configure Cacti (from the root directory):**
   ```bash
   cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti
   npm run configure
   ```

3. **Start the required ledgers:**
   ```bash
   cd examples/cactus-example-electricity-trade
   ./script-start-ledgers.sh
   ```

4. **Run the application:**
   ```bash
   npm start
   # or
   npm run dev
   ```

### Method 3: Using Docker Compose

Many examples include `docker-compose.yml` files. You can run them with:

```bash
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/[example-name]
docker-compose up
```

### Specific Example Instructions

#### Discounted Asset Trade Example
```bash
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-discounted-asset-trade
./script-start-ledgers.sh  # Start required blockchain networks
npm install
npm start
```

#### CBDC Bridging Example
```bash
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-cbdc-bridging-backend
npm install
npm start
```

### Troubleshooting

1. **If you encounter permission issues with scripts:**
   ```bash
   chmod +x script-start-ledgers.sh
   ```

2. **If Docker containers fail to start:**
   - Ensure Docker is running
   - Check if required ports are available
   - Try running with `--privileged` flag

3. **If Node.js dependencies are missing:**
   ```bash
   npm install
   ```

4. **For cleanup between runs:**
   ```bash
   ./script-cleanup.sh  # Available in some examples
   ```

### Next Steps

1. **Start with the Supply Chain example** using Docker - it's the most complete and easiest to run
2. **Explore the web interface** at the provided URLs
3. **Check the individual README files** in each example directory for specific instructions
4. **Look at the configuration files** in the `config/` directories to understand how to customize the examples

The examples demonstrate various blockchain interoperability scenarios and can serve as templates for building your own cross-chain applications.


```shellscript
docker run \
  --rm \
  --privileged \
  -p 3000:3000 \
  -p 3100:3100 \
  -p 3200:3200 \
  -p 4000:4000 \
  -p 4100:4100 \
  -p 4200:4200 \
  ghcr.io/hyperledger/cactus-example-supply-chain-app:2024-03-08--pr-3059-1
```

```shellscript
   cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-electricity-trade
```

```shellscript
   cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti
   npm run configure
```

```shellscript
   cd examples/cactus-example-electricity-trade
   ./script-start-ledgers.sh
```

```shellscript
   npm start
   # or
   npm run dev
```

```shellscript
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/[example-name]
docker-compose up
```

```shellscript
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-discounted-asset-trade
./script-start-ledgers.sh  # Start required blockchain networks
npm install
npm start
```

```shellscript
cd /Ubuntu/home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-cbdc-bridging-backend
npm install
npm start
```

```shellscript
   chmod +x script-start-ledgers.sh
```

```shellscript
   npm install
```

```shellscript
   ./script-cleanup.sh  # Available in some examples
```

I've provided you with a comprehensive guide on how to run Cacti examples. The easiest way to get started is with the Supply Chain application using Docker, as it requires minimal setup. For development and customization, you can run the examples from source using the Node.js scripts and configuration files.

Would you like me to help you run a specific example, or do you have questions about any particular aspect of the setup process?

