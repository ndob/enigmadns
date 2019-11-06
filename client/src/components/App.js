// Imports - React
import React, {
    Component
} from "react";
// Imports - Redux
import connect from "react-redux/es/connect/connect";
// Imports - Frameworks (Semantic-UI and Material-UI)
import {
    Container,
    Message
} from "semantic-ui-react";
import Paper from "@material-ui/core/Paper";
import {
    withStyles
} from "@material-ui/core";
// Imports - Initialize Enigma
import getEnigmaInit from "../utils/getEnigmaInit.js";
// Imports - Components
import Header from "./Header";
import "../App.css";
// Imports - Actions (Redux)
import {
    initializeEnigma,
    initializeAccounts
} from '../actions';

import {
    Enigma,
    utils,
    eeConstants
} from 'enigma-js';

const abi = require('ethereumjs-abi');
const BN = require('bn.js');

const styles = theme => ({
    root: {
        flexGrow: 1,
    },
    paper: {
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
});

const EnigmaDNSErrorCode = {
    None: new BN(0, 10),
    AlreadyRegistered: new BN(1, 10),
    Unauthorized: new BN(2, 10)
};

class EnigmaDNS {
    constructor(enigma, accounts, contractAddress) {
        this.enigma = enigma;
        this.accounts = accounts;
        this.contractAddress = contractAddress;
    }

    async tryRegister(domain, userId) {
        let result = await this.makeCall('register(string,string)', [
            [domain, 'string'],
            [userId, 'string']
        ], 'int256');

        this.printResult("register", result[0]);
        return result[0] && result[0].toNumber() === EnigmaDNSErrorCode.None.toNumber();
    }

    async resolve(domain) {
        let result = await this.makeCall('resolve(string)', [
            [domain, 'string']
        ], 'string');
        // this.printResult("resolve", result);
        return result[0];
    }

    async setTarget(domain, target, userId) {
        let result = await this.makeCall('set_target(string,string,string)', [
            [domain, 'string'],
            [target, 'string'],
            [userId, 'string']
        ], 'int256');
        this.printResult("setTarget", result[0]);
        return result[0] && result[0].toNumber() === EnigmaDNSErrorCode.None.toNumber();
    }

    printResult(caller, result) {
        if (!result) {
            console.log("Unknown error");
            return;
        }

        switch (result.toNumber()) {
            case EnigmaDNSErrorCode.None.toNumber():
                console.log("Call successful:" + caller);
                break;
            case EnigmaDNSErrorCode.AlreadyRegistered.toNumber():
                console.log("Already registered:" + caller);
                break;
            case EnigmaDNSErrorCode.Unauthorized.toNumber():
                console.log("Unauthorized:" + caller);
                break;
        }
    }

    async makeCall(funcSignature, args, retType) {
        let task = null;
        while (true) {
            try {
                let taskFn = funcSignature;
                let taskArgs = args;
                let taskGasLimit = 90000000;
                let taskGasPx = utils.toGrains(0.0001);
                task = await new Promise((resolve, reject) => {
                    this.enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, this.accounts[0], this.contractAddress)
                        .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                        .on(eeConstants.ERROR, (error) => reject(error));
                });
                break;
            } catch (err) {
                console.log("ERROR:" + JSON.stringify(err));
                return null;
            }
        }

        console.log("Created compute task.");

        task = await this.enigma.getTaskRecordStatus(task);
        if (task.ethStatus != 1) {
            console.log("ERROR: getTaskRecordStatus");
            return null;
        }

        do {
            const sleep = m => new Promise(r => setTimeout(r, m));

            await sleep(1000);
            task = await this.enigma.getTaskRecordStatus(task);
            console.log('Waiting. Current Task Status is ' + task.ethStatus + '\r');
        } while (task.ethStatus != 2);

        if (task.ethStatus != 2) {
            console.log("Error: Task status != 2.");
            return null;
        }

        console.log('Completed. Final Task Status is ' + task.ethStatus + '\n');

        task = await new Promise((resolve, reject) => {
            this.enigma.getTaskResult(task)
                .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });

        if (task.engStatus !== 'SUCCESS') {
            console.log("Error: Task status");
            return null;
        }

        task = await this.enigma.decryptTaskResult(task);

        let ret = abi.rawDecode([retType], Buffer.from(task.decryptedOutput, 'hex'))
        return ret;
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            domainToRegister: "",
            domainToResolve: "",
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.handleResolveChange = this.handleResolveChange.bind(this);
        this.handleResolve = this.handleResolve.bind(this);
    }

    async componentDidMount() {
        // Initialize enigma-js client library (including web3)
        const enigma = await getEnigmaInit();
        // Create redux action to initialize set state variable containing enigma-js client library
        this.props.initializeEnigma(enigma);
        // Initialize unlocked accounts
        const accounts = await enigma.web3.eth.getAccounts();
        // Create redux action to initialize set state variable containing unlocked accounts
        this.props.initializeAccounts(accounts);

        const contractAddress = "0x88987af7d35eabcad95915b93bfd3d2bc3308f06b7197478b0dfca268f0497dc";
        this.enigmaDNS = new EnigmaDNS(enigma, accounts, contractAddress);
    }

    async tryRegister(domain) {
        console.log("Trying to register");
        if (await this.enigmaDNS.tryRegister(domain, "myname")) {
            let target = "1.1.1.1";
            if (await this.enigmaDNS.setTarget(domain, target, "myname")) {
                alert("Successfully registered:" + domain + " -> " + target);
                return;
            }
        }
        alert("Registration failed");
    }

    async resolve(domain) {
        console.log("Starting resolve");
        let resolved = await this.enigmaDNS.resolve(domain);
        alert("Resolved:" + resolved);
    }

    handleChange(event) {
        this.setState({
            domainToRegister: event.target.value
        });
    }

    handleSubmit(event) {
        this.tryRegister(this.state.domainToRegister);
        event.preventDefault();
    }

    handleResolveChange(event) {
        this.setState({
            domainToResolve: event.target.value
        });
    }

    handleResolve(event) {
        this.resolve(this.state.domainToResolve);
        event.preventDefault();
    }

    render() {
        if (!this.props.enigma) {
            return (
                <Message>Enigma loading...</Message>
            );
        } else {
            return (
                <div>
                <Header />
                <Message>Enigma loaded.</Message>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        Register domain:
                        <input type="text" value={this.state.domainToRegister} onChange={this.handleChange} />
                    </label>
                    <input type="submit" value="Submit" />
                </form>
                <form onSubmit={this.handleResolve}>
                    <label>
                        Resolve:
                        <input type="text" value={this.state.domainToResolve} onChange={this.handleResolveChange} />
                    </label>
                    <input type="submit" value="Submit" />
                </form>
                </div>
            );
        }
    }
}

const mapStateToProps = (state) => {
    return {
        enigma: state.enigma
    }
};

export default connect(
    mapStateToProps, {
        initializeEnigma,
        initializeAccounts
    }
)(withStyles(styles)(App));
