/* global atom */
"use strict";

const child_process = require("child_process");
const path = require("path");
const CompositeDisposable = require("atom").CompositeDisposable;

module.exports = {
    activate() {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.
            add("atom-text-editor", {
                "compiler:compile": () => {
                    compileFile(getFileType());
                },
              }
            )
        );
    },
    config: {
        cCompilerOptions: {
            default: "",
            description: "C Flags",
            title: "C Compiler Flags",
            type: "string"
        },
        cppCompilerOptions: {
            default: "",
            description: "C++ Flags",
            title: "C++ Compiler Flags",
            type: "string"
        },
        rustCompilerOptions: {
            default: "",
            description: "Rust Flags",
            title: "Rust Compiler Flags",
            type: "string"
        },
        runAfterCompile: {
            default: true,
            description: "",
            title: "Run After Compile",
            type: "boolean"
        },
        terminal: {
            default: "st",
            description: "Terminal",
            title: "Terminal Emulator",
            type: "string"
        },
        terminalArgs: {
            default: "-ae",
            description: "Terminal arguments",
            title: "Terminal Emulator arguments",
            type: "string"
        }
    },
};

function getFileType() {
    return atom.workspace.
        getActiveTextEditor().
        getGrammar().
        name;
}


function getArgs(files, output, fileType) {
    // atom throws a SyntaxError if you use ES6's default parameters
    if (fileType == 'C') {
        var chosenOptions = "c";
    }
    else if(fileType == 'C++'){
        var chosenOptions = "cpp";
    }
    else if(fileType == 'Rust'){
        var chosenOptions = "rust";
    }
    // array of arguments to pass to the compiler
    const args = [
        ...files,
        "-o",
        output,
        ...atom.
            config.
            // string of all user-defined options
            get(`compiler.${chosenOptions}CompilerOptions`).
            // turn that string into an array separated by spaces
            split(" ").
            // remove falsy elements
            filter(Boolean)
    ];
    return args;
}


function compileFile(fileType) {
    const file = atom.workspace.getActiveTextEditor().buffer.file;

    if (file) {
        const info = path.parse(file.path);
        if (fileType == 'C') {
            var chosenCompiler = "gcc";
        }
        else if(fileType == 'C++'){
            var chosenCompiler = "g++";
        }
        else if(fileType == 'Rust'){
            var chosenCompiler = "rustc";
        }
        else{
            atom.notifications.
                addError("<strong>File type not supported.</strong><br/>Not a supported file type.");
        }
        compile(chosenCompiler, info, getArgs([file.path], path.join(info.dir, info.name), fileType));
    } else {
        atom.notifications.
            addError("<strong>File not found.</strong><br/>Save before compiling.");
    }
}


// spawn the compiler to compile files and optionally run the compiled files
function compile(command, info, args) {
    // if the user has a text editor open, save it
    if (atom.workspace.getActiveTextEditor()) {
        atom.workspace.getActiveTextEditor().save();
    }
    // spawn the compiler with the working directory of info.dir
    const child = child_process.spawn(command, args, {
        cwd: info.dir
    });

    // if the compile exits with a non-zero status, alert the user the error
    let stderr = "";

    child.stderr.
        on("data", (data) => {stderr += data;});
    // callback when the child's stdio streams close
    child.on("close", (code) => {
        // if the exit code is a non-zero status, alert the user stderr
        if (code) {
            atom.notifications.
                addError(stderr.replace(/\n/g, "<br/>"));
        } else {
            // compilation was successful, but there still may be warnings
            if (stderr) {
				atom.notifications.addWarning(stderr.replace(/\n/g, "<br/>"));
			}

            // if the user wants the program to run after compilation, run it in their
            // favorite terminal
            if (atom.config.get("compiler.runAfterCompile")) {
                // options to tell child_process.spawn() to run in the directory of the
                // program
                const options = {
                    cwd: info.dir
                };

                if (true) {
                    //spawn the program in the user set
                    // terminal
                    const file = path.join(info.dir, info.name);

                    let terminalCommand = null;
                    let args = null;

                    child_process.spawn(atom.config.get("compiler.terminal"), [
                        ...[atom.config.get("compiler.terminalArgs")],
                        file
                    ], options);
                }
            }
        }
    });
}
