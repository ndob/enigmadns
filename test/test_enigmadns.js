const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const SampleContract = artifacts.require("Sample");
const {
    Enigma,
    utils,
    eeConstants
} = require('enigma-js/node');

const abi = require('ethereumjs-abi');
const BN = require('bn.js');

const EnigmaDNSErrorCode = {
    None: new BN(0, 10),
    AlreadyRegistered: new BN(1, 10),
    Unauthorized: new BN(2, 10)
};

var EnigmaContract;
if (typeof process.env.SGX_MODE === 'undefined' || (process.env.SGX_MODE != 'SW' && process.env.SGX_MODE != 'HW')) {
    console.log(`Error reading ".env" file, aborting....`);
    process.exit();
} else if (process.env.SGX_MODE == 'SW') {
    EnigmaContract = require('../build/enigma_contracts/EnigmaSimulation.json');
} else {
    EnigmaContract = require('../build/enigma_contracts/Enigma.json');
}
const EnigmaTokenContract = require('../build/enigma_contracts/EnigmaToken.json');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeCall(enigma, accounts, contractAddr, funcSignature, args, retType) {
    let task = null;
    while (true) {
        try {
            let taskFn = funcSignature;
            let taskArgs = args;
            let taskGasLimit = 90000000;
            let taskGasPx = utils.toGrains(0.0001);
            task = await new Promise((resolve, reject) => {
                enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
                    .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                    .on(eeConstants.ERROR, (error) => reject(error));
            });
            break;
        } catch (err) {
            console.log("error:" + err);
        }
    }

    task = await enigma.getTaskRecordStatus(task);
    if (task.ethStatus != 1) {
        console.log("ETH ERROR");
    }

    do {
        const sleep = m => new Promise(r => setTimeout(r, m));

        await sleep(1000);
        task = await enigma.getTaskRecordStatus(task);
        console.log('Waiting. Current Task Status is ' + task.ethStatus + '\r');
    } while (task.ethStatus != 2);

    if (task.ethStatus != 2) {
        console.log("ETH ERROR 2");
    }

    console.log('Completed. Final Task Status is ' + task.ethStatus + '\n');


    task = await new Promise((resolve, reject) => {
        enigma.getTaskResult(task)
            .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
            .on(eeConstants.ERROR, (error) => reject(error));
    });

    if (task.engStatus !== 'SUCCESS') {
        console.log("ETH ERROR 3");
    }

    task = await enigma.decryptTaskResult(task);

    let ret = abi.rawDecode([retType], Buffer.from(task.decryptedOutput, 'hex'))
    return ret;

}

let enigma = null;
const contractAddr = fs.readFileSync('test/enigmadns.txt', 'utf-8');

contract("Sample", accounts => {
    before(function() {
        enigma = new Enigma(
            web3,
            EnigmaContract.networks['4447'].address,
            EnigmaTokenContract.networks['4447'].address,
            'http://localhost:3333', {
                gas: 4712388,
                gasPrice: 100000000000,
                from: accounts[0],
            },
        );
        enigma.admin();
        enigma.setTaskKeyPair('cupcake');
    })

    let task;
    it('should execute register', async () => {
        let taskFn = 'register(string,string)';
        let taskArgs = [
            ['testdomain', 'string'],
            ['register_for_me', 'string'],
        ];
        let taskGasLimit = 10000000;
        let taskGasPx = utils.toGrains(1);
        const contractAddr = fs.readFileSync('test/enigmadns.txt', 'utf-8');
        task = await new Promise((resolve, reject) => {
            enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
    });

    it('should get the pending task', async () => {
        task = await enigma.getTaskRecordStatus(task);
        expect(task.ethStatus).to.equal(1);
    });

    it('should get the confirmed task', async () => {
        do {
            await sleep(1000);
            task = await enigma.getTaskRecordStatus(task);
            process.stdout.write('Waiting. Current Task Status is ' + task.ethStatus + '\r');
        } while (task.ethStatus != 2);
        expect(task.ethStatus).to.equal(2);
        process.stdout.write('Completed. Final Task Status is ' + task.ethStatus + '\n');
    }, 10000);

    it('should get the result and verify the computation is correct', async () => {
        task = await new Promise((resolve, reject) => {
            enigma.getTaskResult(task)
                .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
        expect(task.engStatus).to.equal('SUCCESS');
        task = await enigma.decryptTaskResult(task);

        let result = parseInt(task.decryptedOutput, 16);
        expect(result).to.equal(EnigmaDNSErrorCode.None.toNumber());
    });

    it('should fail registering twice', async () => {
        result = await makeCall(enigma, accounts, contractAddr, 'register(string,string)',[
            ['testdomain', 'string'],
            ['register_for_me', 'string'],
        ], 'int256');

        result = await makeCall(enigma, accounts, contractAddr, 'register(string,string)',[
            ['testdomain', 'string'],
            ['register_for_me', 'string'],
        ], 'int256');

        expect(result[0].toNumber()).to.equal(EnigmaDNSErrorCode.AlreadyRegistered.toNumber());
    });

    it('should register, set address and resolve', async() => {
        const expectNoError = (res) => {
            expect(res[0].toNumber()).to.equal(EnigmaDNSErrorCode.None.toNumber());
        };

        // Register.
        let result = await makeCall(enigma, accounts, contractAddr, 'register(string,string)', [ ['testdomain123', 'string'], ['testusername', 'string']], 'int256');
        expectNoError(result);

        // Change the domain to point an address.
        result = await makeCall(enigma, accounts, contractAddr, 'set_target(string,string,string)', [ ['testdomain123', 'string'], ['1.1.1.1', 'string'], ['testusername', 'string']], 'int256');
        expectNoError(result);

        // Resolve address.
        result = await makeCall(enigma, accounts, contractAddr, 'resolve(string)', [ ['testdomain123', 'string'] ], 'string');
        expect(result[0]).to.equal('1.1.1.1');
    });

    it('should fail to set address from a different user', async() => {
        // Register with user A.
        let result = await makeCall(enigma, accounts, contractAddr, 'register(string,string)', [ ['testdomain123', 'string'], ['userA', 'string']], 'int256');

        result = await makeCall(enigma, accounts, contractAddr, 'set_target(string,string,string)', [ ['testdomain123', 'string'], ['1.1.1.3', 'string'], ['userB', 'string']], 'int256');

        expect(result[0].toNumber()).to.equal(EnigmaDNSErrorCode.Unauthorized.toNumber());

        // Resolve address.
        result = await makeCall(enigma, accounts, contractAddr, 'resolve(string)', [ ['testdomain123', 'string'] ], 'string');
        expect(result).to.not.equal('1.1.1.3');
    });


})
