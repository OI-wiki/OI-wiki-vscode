// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

interface ISearchResult {
  url: string,
  title: string,
  highlight: Array<string>
}

function stripHTMLAndEscapes(str: string): string {
  let res = str.replace(/<.*?>/g, '');
  res = res.replace(/\\[a-z]/g, '');
  res = res.replace(/\s*/, ' ');
  return res;
}

function getItemString(item: ISearchResult): string {
  let highlight = item.highlight || '无简介';
  let res = `${item.title}: ${highlight.concat()}`;
  res = stripHTMLAndEscapes(res);
  return res;
}

export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('extension.OIWiki', async () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    let keyword = await vscode.window.showInputBox({ prompt: "输入你想搜索的 OI-wiki 词条..." });
    if (keyword === undefined) {
      return;
    }
    let res;
    try {
      res = await axios.get(encodeURI(`https://search.oi-wiki.org:8443/?s=${keyword}`));
    } catch (e) {
      vscode.window.showErrorMessage("无法连接到服务器");
      return;
    }
    let data: Array<ISearchResult> = res?.data;
    if (data.length === 0) {
      vscode.window.showWarningMessage("没有找到相关词条");
      return;
    }
    let previewString = [...data].map(getItemString);
    let pickResultString = await vscode.window.showQuickPick(previewString, { canPickMany: false });
    if (pickResultString === undefined) {
      return;
    }
    let LoadingTip = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    LoadingTip.text = "$(sync~spin)正在加载页面...";
    LoadingTip.show();
    let pickResult = data.filter(v => getItemString(v) === pickResultString)[0];
    let HTMLStr = (await axios.get(`https://oi-wiki.org${pickResult.url}`)).data;
    let webview = vscode.window.createWebviewPanel('oi-wiki', pickResult.title, { viewColumn: vscode.ViewColumn.Two, preserveFocus: false }, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableCommandUris: true
    });
    webview.reveal(vscode.ViewColumn.Beside, false);
    const workaroundRegex = /href="(\.\.\/)*assets/g;
    HTMLStr = HTMLStr.replace(workaroundRegex, 'href="https://oi-wiki.org/assets');
    HTMLStr = HTMLStr.replace('<body', '<body style="background: white"');
    webview.webview.html = HTMLStr
    LoadingTip.dispose();
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
