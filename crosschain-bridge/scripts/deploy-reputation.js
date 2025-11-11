/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Web3 } = require('web3');
const config = require('../src/config');

function compile(sourcePath, contractName) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const input = {
        language: 'Solidity',
        sources: { [path.basename(sourcePath)]: { content: source } },
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: 'istanbul',
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
        },
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (output.errors) {
        const errs = output.errors.filter((e) => e.severity === 'error');
        if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join('\n'));
    }
    const art = output.contracts[path.basename(sourcePath)][contractName];
    return { abi: art.abi, bytecode: '0x' + art.evm.bytecode.object };
}

async function main() {
    const web3 = new Web3(config.ETHEREUM.RPC_URL);
    if (config.ETHEREUM.PRIVATE_KEY) {
        const account = web3.eth.accounts.privateKeyToAccount(config.ETHEREUM.PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
    }
    let deployer = web3.eth.defaultAccount;
    if (!deployer) {
        const accs = await web3.eth.getAccounts();
        deployer = accs && accs[0];
    }
    if (!deployer) throw new Error('No deployer account available (set ETHEREUM_PRIVATE_KEY)');
    console.log('Deployer:', deployer);

    // Compile CrossTrustReputation contract
    const reputation = compile(
        path.join(__dirname, '../contracts/CrossTrustReputation.sol'),
        'CrossTrustReputation'
    );

    // Deploy CrossTrustReputation
    const Reputation = new web3.eth.Contract(reputation.abi);
    const reputationDeploy = Reputation.deploy({ data: reputation.bytecode });
    const estReputation = await reputationDeploy.estimateGas({ from: deployer });
    const gasReputation = Math.max(Math.floor(Number(estReputation) * 1.5), 6_000_000);
    const reputationContract = await reputationDeploy.send({
        from: deployer,
        gas: gasReputation,
        maxFeePerGas: 1_000_000_000,
        maxPriorityFeePerGas: 0
    });
    console.log('CrossTrustReputation deployed at:', reputationContract.options.address);

    // Load existing addresses if they exist
    const addressesPath = path.join(__dirname, '../contracts/addresses.json');
    let existingAddresses = {};
    if (fs.existsSync(addressesPath)) {
        existingAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    }

    // Update addresses with reputation contract
    const out = {
        ...existingAddresses,
        reputationAddress: reputationContract.options.address,
        networkId: Number(await web3.eth.net.getId()),
        deployedAt: new Date().toISOString(),
        abi: {
            ...(existingAddresses.abi || {}),
            reputation: reputation.abi
        }
    };

    fs.writeFileSync(addressesPath, JSON.stringify(out, null, 2));
    console.log('Saved', addressesPath);
    console.log('\n✅ CrossTrustReputation contract deployed successfully!');
    console.log('Address:', reputationContract.options.address);
}

main().catch((e) => { console.error(e); process.exit(1); });

