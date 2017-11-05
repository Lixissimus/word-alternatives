// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
// const { translate, detectLanguage } = require('deepl-translator');
const { translate, detectLanguage, wordAlternatives } = require('../../deepl-translator/index');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "deepl-translate" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.translate', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // no open editor
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        
        detectLanguage(text)
        .then(res => {
            console.log(`Detected: ${res.languageCode}`);
            let targetLanguage = 'EN';
            if (res.languageCode === 'EN') {
                targetLanguage = 'DE';
            }

            
            translate(text, targetLanguage)
            .then(res => {
                const range = new vscode.Range(selection.end, selection.end);
                // const textEdit = new vscode.TextEdit(range, res.translation);
                const wsEdit = new vscode.WorkspaceEdit();
                wsEdit.replace(editor.document.uri, range, res.translation);
                vscode.workspace.applyEdit(wsEdit);
                const sel = new vscode.Selection(
                    selection.end.line, 
                    selection.end.character, 
                    selection.end.line, 
                    selection.end.character + res.translation.length);
                
                editor.selection = sel;
            });
        });
    });

    vscode.commands.registerCommand('extension.alternative', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // no open editor
            return;
        }

        // store and clear current selection
        const initialSelection = editor.selection;
        // const text = editor.document.getText(initialSelection);

        const prefixText = editor.document.getText(new vscode.Range(
                initialSelection.start.line,
                0,
                initialSelection.start.line,
                initialSelection.start.character
        ));

        const sentence = editor.document.getText(new vscode.Range(
                initialSelection.start.line, 0,
                initialSelection.start.line + 1, 0
        ));

        let translatedSentence = '';

        
        translate(sentence, 'DE', 'EN')
        .then(res => {
            translatedSentence = res.translation
            return wordAlternatives(translatedSentence, prefixText, 'EN', 'DE')
        })
        .then(alternatives => {
            return Promise.all([
                alternatives,
                vscode.window.showQuickPick(alternatives.map(alt => {
                    return alt.slice(prefixText.length);
                }))
            ])
        })
        .then(vals => {
            const alternatives = vals[0];
            const selected = vals[1];
            const selectedPrefix = alternatives.find(el => {
                return el.slice(prefixText.length) === selected; 
            });
            return translate(translatedSentence, 'EN', 'DE', selectedPrefix);
        })
        .then(altSentence => {
            // apply alternate sentence
            editor.edit(edit => {
                edit.replace(new vscode.Selection(
                    initialSelection.start.line, 0, 
                    initialSelection.start.line + 1, 0),
                    altSentence.translation);
            // adjust current selection
            editor.selection = new vscode.Selection(
                    initialSelection.start.line,
                    0,
                    initialSelection.start.line,
                    initialSelection.start.character + altSentence.translation.length);
            });
        });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
