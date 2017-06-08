const ChromeLauncher = require('lighthouse/chrome-launcher');

/**
 * Launches a debugging instance of Chrome on port 9222.
 * @param {boolean=} headless True (default) to launch Chrome in headless mode.
 *     Set to false to launch Chrome normally.
 * @return {Promise<ChromeLauncher>}
 */
function launchChrome(headless = true) {
  const launcher = ChromeLauncher.launch({
    port: 9222,
    autoSelectChrome: true, // False to manually select which Chrome install.
    additionalFlags: [
      '--window-size=412,732',
      '--disable-gpu',
      headless ? '--headless' : ''
    ]
  });

  return launcher.then(() => launcher)
    .catch(err => {
      return launcher.kill().then(() => { // Kill Chrome if there's an error.
        throw err;
      }, console.error);
    });
}
const chrome = require('chrome-remote-interface');

function onPageLoad(Runtime) {
  const js = "document.body";

  // Evaluate the JS expression in the page.
  return Runtime.evaluate({expression: js}).then(result => {
    console.log('Title of page: ' + result.result.value);
  });
}

launchChrome().then(launcher => {

  chrome(protocol => {
    // Extract the parts of the DevTools protocol we need for the task.
    // See API docs: https://chromedevtools.github.io/devtools-protocol/
    const {Page, Runtime, DOM} = protocol;

    // First, need to enable the domains we're going to use.
    Promise.all([
      Page.enable(),
      DOM.enable(),
      Runtime.enable()
    ]).then(() => {
      Page.navigate({url: 'https://www.lifehack.org/'});

      // Wait for window.onload before doing stuff.
      Page.loadEventFired(() => {
        setTimeout(() => {
            DOM.getFlattenedDocument(-1)
            // DOM.getDocument()
                // .then((data) => {
                //     console.log(data.root.children[2]);
                //     return DOM.querySelectorAll(data.root.children[2].nodeId, 'a');
                // })
                .then((data) => {
                    // console.log(data);
                    for (var i = data.nodes.length - 1; i >= 0; i--) {
                        let node = data.nodes[i];
                        if (node.nodeName == 'A') {
                            // console.log(node.attributes);
                            let key = node.attributes.indexOf('href') + 1;
                            if (key > 0) {
                                console.log(node.attributes[key]);
                            }
                        }
                    }
                    protocol.close();
                    launcher.kill(); // Kill Chrome.
                })
        }, 20000)
      });

    });

  }).on('error', err => {
    throw Error('Cannot connect to Chrome:' + err);
  });

});
