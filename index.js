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
                    verifyCompile(getFileType());
                },
              }
            )
        );
    },
    config: {
        cCompiler:{
            default: "gcc",
            description: "C Compiler",
            title: "C Compiler",
            type: "string"
        },
        cCompilerOptions: {
            default: "",
            description: "C Flags",
            title: "C Compiler Flags",
            type: "string"
        },
        cppCompiler:{
            default: "g++",
            description: "C++ Compiler",
            title: "C++ Compiler",
            type: "string"
        },
        cppCompilerOptions: {
            default: "",
            description: "C++ Flags",
            title: "C++ Compiler Flags",
            type: "string"
        },
        rustCompiler:{
            default: "rustc",
            description: "Rust Compiler",
            title: "Rust Compiler",
            type: "string"
        },
        rustCompilerOptions: {
            default: "",
            description: "Rust Flags",
            title: "Rust Compiler Flags",
            type: "string"
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
        },
        runAfterCompile: {
            default: true,
            description: "",
            title: "Run After Compile",
            type: "boolean"
        }
    },
};


function getFileType() {
    return atom.workspace
        .getActiveTextEditor()
        .getGrammar()
        .name;
}


function getCompiler(fileType){
    return atom
        .config
        .get(`compiler.${fileType.toLowerCase().replace("++", "pp")}Compiler`);
}


function getArgs(files, output, fileType) {
    // array of arguments to pass to the compiler
    const args = [
        ...files,"-o",output,
        ...atom.config.
            // string of all user-defined options
            get(`compiler.${fileType.toLowerCase().replace("++", "pp")}CompilerOptions`)
            // turn that string into an array separated by spaces
            .split(" ")
            // remove fals elements
            .filter(Boolean)
    ];
    return args;
}

function verifyCompile(fileType){
    const file = atom.workspace.getActiveTextEditor().buffer.file;

    // if the file doesn't exist in the file system, throw warning
    if (!file) {
        atom.notifications.
            addError("<strong>File not found.</strong><br/>Save before compiling.");
    } else if(!getCompiler(fileType)){ //if no compiler exists for the given program type, throw warning
        atom.notifications.
            addError("<strong>File type not supported.</strong><br/>Not a supported file type.");
    } else {
        const info = path.parse(file.path);
        compile(getCompiler(fileType), info, getArgs([file.path], path.join(info.dir, info.name), fileType));
    }
}


function compile(command, info, args) {
    // save the currently open file
    atom.workspace.getActiveTextEditor().save();
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
            if (stderr) {// compilation was successful, but there still may be warnings
                atom.notifications.addWarning(stderr.replace(/\n/g, "<br/>"));
            }
            if (atom.config.get("compiler.runAfterCompile")) {// run program in terminal after compilation
                if (true) {
                    child_process.spawn(atom.config.get("compiler.terminal"), [
                        ...[atom.config.get("compiler.terminalArgs")],
                        path.join(info.dir, info.name)]);
                }
            }
        }
    });
}
