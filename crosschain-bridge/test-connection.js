const { Web3 } = require('web3');

async function testEthereumConnection() {
    try {
        console.log('🔍 Testing Ethereum/Besu connection...');

        const web3 = new Web3('http://localhost:8545');

        // Test connection
        const isConnected = await web3.eth.net.isListening();
        console.log(`✅ Ethereum connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

        if (isConnected) {
            // Get network info
            const networkId = await web3.eth.net.getId();
            const accounts = await web3.eth.getAccounts();

            console.log(`📊 Network ID: ${networkId}`);
            console.log(`💰 Accounts: ${accounts.length}`);

            if (accounts.length > 0) {
                const balance = await web3.eth.getBalance(accounts[0]);
                console.log(`💎 Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
            }
        }

        return isConnected;
    } catch (error) {
        console.error('❌ Ethereum connection failed:', error.message);
        return false;
    }
}

async function testFabricConnection() {
    try {
        console.log('🔍 Testing Fabric connection...');

        // Check if Fabric containers are running
        const { exec } = require('child_process');

        return new Promise((resolve) => {
            exec('docker ps --filter "name=peer0.org1" --format "{{.Names}}"', (error, stdout) => {
                if (error) {
                    console.error('❌ Fabric connection failed:', error.message);
                    resolve(false);
                } else {
                    const isRunning = stdout.trim().includes('peer0.org1.example.com');
                    console.log(`✅ Fabric connection: ${isRunning ? 'SUCCESS' : 'FAILED'}`);
                    resolve(isRunning);
                }
            });
        });
    } catch (error) {
        console.error('❌ Fabric connection failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Testing Cross-Chain Bridge Connections...\n');

    const ethereumConnected = await testEthereumConnection();
    console.log('');
    const fabricConnected = await testFabricConnection();

    console.log('\n📊 Connection Summary:');
    console.log(`   Ethereum/Besu: ${ethereumConnected ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   Hyperledger Fabric: ${fabricConnected ? '✅ Connected' : '❌ Failed'}`);

    if (ethereumConnected && fabricConnected) {
        console.log('\n🎉 Both networks are connected! Cross-chain bridge is ready.');
        console.log('\n📋 Next steps:');
        console.log('   1. Install bridge dependencies: npm install');
        console.log('   2. Start the bridge: npm start');
        console.log('   3. Test the API: curl http://localhost:3000/health');
    } else {
        console.log('\n⚠️  Some networks are not connected. Please check:');
        if (!ethereumConnected) {
            console.log('   - Ensure Besu is running: docker-compose up -d');
        }
        if (!fabricConnected) {
            console.log('   - Ensure Fabric network is running: ./network.sh up createChannel -ca');
        }
    }
}

main().catch(console.error);

