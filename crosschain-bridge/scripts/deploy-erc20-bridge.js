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

    const erc20 = compile(path.join(__dirname, '../contracts/ERC20Token.sol'), 'ERC20Token');
    const bridge = compile(path.join(__dirname, '../contracts/Bridge.sol'), 'Bridge');

    const Token = new web3.eth.Contract(erc20.abi);
    const initialSupply = web3.utils.toWei('1000000', 'ether');
    const tokenDeploy = Token.deploy({ data: erc20.bytecode, arguments: ['DemoToken', 'DMT', initialSupply] });
    const estToken = await tokenDeploy.estimateGas({ from: deployer });
    const gasToken = Math.max(Math.floor(Number(estToken) * 1.5), 6_000_000);
    const token = await tokenDeploy.send({ from: deployer, gas: gasToken, maxFeePerGas: 1_000_000_000, maxPriorityFeePerGas: 0 });
    console.log('Token deployed at:', token.options.address);

    const Bridge = new web3.eth.Contract(bridge.abi);
    const bridgeDeploy = Bridge.deploy({ data: bridge.bytecode, arguments: [token.options.address] });
    const estBridge = await bridgeDeploy.estimateGas({ from: deployer });
    const gasBridge = Math.max(Math.floor(Number(estBridge) * 1.5), 6_000_000);
    const bridgeCtr = await bridgeDeploy.send({ from: deployer, gas: gasBridge, maxFeePerGas: 1_000_000_000, maxPriorityFeePerGas: 0 });
    console.log('Bridge deployed at:', bridgeCtr.options.address);

    // Approve bridge for large allowance by deployer
    await token.methods.approve(bridgeCtr.options.address, initialSupply).send({ from: deployer });

    const out = {
        tokenAddress: token.options.address,
        bridgeAddress: bridgeCtr.options.address,
        networkId: Number(await web3.eth.net.getId()),
        deployedAt: new Date().toISOString(),
        abi: { token: erc20.abi, bridge: bridge.abi },
    };
    const outPath = path.join(__dirname, '../contracts/addresses.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Saved', outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });


