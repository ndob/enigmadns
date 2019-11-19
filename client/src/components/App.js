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

import { EnigmaDNS } from "enigmadns-js";

// Imports - Components
import Header from "./Header";
import "../App.css";

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

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            domainToRegister: "",
            domainToResolve: "",
            domainToChange: "",
            domainTarget: "",
            isRequesting: false
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.handleDomainChange = this.handleDomainChange.bind(this);
        this.handleDomainTargetChange = this.handleDomainTargetChange.bind(this);
        this.handleTargetChange = this.handleTargetChange.bind(this);

        this.handleResolveChange = this.handleResolveChange.bind(this);
        this.handleResolve = this.handleResolve.bind(this);
    }

    async componentDidMount() {
        this.enigmaDNS = new EnigmaDNS();
    }

    async tryRegister(domain) {
        console.log("Trying to register");
        if (await this.enigmaDNS.tryRegister(domain, "myname")) {
            let target = "1.1.1.1";
            if (await this.changeTarget(domain, target, "myname")) {
                alert("Successfully registered:" + domain + " -> " + target);
                this.setState({
                    isRequesting: false,
                });
                return;
            }
        }
        this.setState({
            isRequesting: false,
        });
        alert("Registration failed");
    }

    async changeTarget(domain, target) {
        if (await this.enigmaDNS.setTarget(domain, target, "myname")) {
            alert("Successfully set target:" + domain + " -> " + target);
            this.setState({
                isRequesting: false,
            });
            return true;
        }
        this.setState({
            isRequesting: false,
        });
        alert("Set target failed.");
        return false;
    }

    async resolve(domain) {
        console.log("Starting resolve");
        let resolved = await this.enigmaDNS.resolve(domain);
        alert("Resolved:" + resolved);
        this.setState({
            isRequesting: false,
        });
    }

    handleChange(event) {
        this.setState({
            domainToRegister: event.target.value
        });
    }

    handleSubmit(event) {
        this.setState({
            isRequesting: true,
        });

        this.tryRegister(this.state.domainToRegister);
        event.preventDefault();
    }

    handleDomainChange(event) {
        this.setState({
            domainToChange: event.target.value
        });
    }

    handleDomainTargetChange(event) {
        this.setState({
            domainTarget: event.target.value
        });
    }

    handleTargetChange(event) {
        this.setState({
            isRequesting: true,
        });

        this.changeTarget(this.state.domainToChange, this.state.domainTarget);
        event.preventDefault();
    }

    handleResolveChange(event) {
        this.setState({
            domainToResolve: event.target.value
        });
    }

    handleResolve(event) {
        this.setState({
            isRequesting: true,
        });

        this.resolve(this.state.domainToResolve);
        event.preventDefault();
    }

    render() {
        return (
            <div>
                <Header />
                <Message>Enigma loaded.</Message>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        Register domain:
                        <input type="text" value={this.state.domainToRegister} onChange={this.handleChange} />
                    </label>
                    <input type="submit" disabled={this.state.isRequesting} value="Submit" />
                </form>

                <form onSubmit={this.handleTargetChange}>
                    <label>
                        Change target of an already registered domain:
                        <input type="text" value={this.state.domainToChange} onChange={this.handleDomainChange} />
                        <input type="text" value={this.state.domainTarget} onChange={this.handleDomainTargetChange} />
                    </label>
                    <input type="submit" disabled={this.state.isRequesting} value="Submit" />
                </form>

                <form onSubmit={this.handleResolve}>
                    <label>
                        Resolve:
                        <input type="text" value={this.state.domainToResolve} onChange={this.handleResolveChange} />
                    </label>
                    <input type="submit" disabled={this.state.isRequesting} value="Submit" />
                </form>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        enigma: state.enigma
    }
};

export default connect(
    mapStateToProps, {}
)(withStyles(styles)(App));
