# Creating a new Tree App example

This tutorial will walk you through creating a simple Tree App.

## Prerequisites

This tutorial assumes you have 2 things:

-   An account on [GitHub](https://github.com/).
-   A code editor and terminal access (this tutorial will be using [Visual Studio Code](https://code.visualstudio.com/)).
-   An account on the [WikiTree Apps server](https://www.wikitree.com/wiki/Help:WikiTree_Apps_Server).

## Forking the repository

Sign into your GitHub account.

Go to the [WikiTree Tree Apps Code Repository](https://github.com/wikitree/wikitree-dynamic-tree).

Click the "Fork" button at the top right. This will take you to a page titled "Create a new fork". You can leave everything as default. Press the "Create fork" button.

You should now have a copy of the repository saved to your GitHub account.

When viewing your copy of the code on GitHub, notice the green button that says "Code". This is where you can download the code to work on locally.

## Downloading the code

Upon opening Visual Studio Code, you should be brought to a "Welcome" page. If you don't see this page, you can access it by going to `Help > Welcome` in the menu.

Under "Start", there is an option to "Clone Git Repository". When you click that, it will ask for a URL.

Go to your code repository on GitHub, click the green "Code" button, and copy the HTTPS link that is shown. Enter that into VS Code and select "Clone from URL".

Select where you would like to save the code on your computer.

After it has been cloned, select "Open" in VS Code.

You should now see the code files in the left-hand sidebar.

You will want to open a terminal so you can run git commands. You can do this in VS Code by selecting `Terminal > New Terminal` in the menu.

## Testing Tree Apps

You should now have a copy of the extension code on your computer.

Because of issues with CORS, the easiest way to test the code is to upload it to your directory on the WikiTree Apps Server.

See [Help:WikiTree Apps Server](https://www.wikitree.com/wiki/Help:WikiTree_Apps_Server) for instructions on how to upload code there.

Double-check that the Tree Apps code is running without errors in your apps directory before moving on to the next step.

## Setting up a new feature

The first thing you want to do before writing a new feature is to switch to a new branch in git. In the terminal, type `git checkout -b helloWorld`.

Create a folder inside `views` called `helloWorld`. Inside that folder, create a file called `helloWorld.js`. This is where you will write your app code. We will come back to it in a bit.

In `index.html`, link your script in the `<head>` section.

```html
<script type="module" src="views/helloWorld/helloWorld.js"></script>
```

The last step is to register your view in `index.js`.

Add your app to the `views` constant:

```js
const views = {
    "couples": new CouplesTreeView(),
    ...
    "helloWorld": new HelloWorldView(),
 };
```

## Writing your feature code

Open the `helloWorld.js` file you created earlier.

Enter this code:

```js
window.HelloWorldView = class HelloWorldView extends View {
    meta() {
        return {
            title: "Hello World",
            description: "A simple example app.",
        };
    }

    init(container_selector, person_id) {
        // TODO
    }
};
```

This simple app will grab the WikiTree ID that was entered, and say `Hello, WikiTree ID`.

To do this, we want to:

-   Ask the API for the First Name of the given WikiTree ID: `const personData = await WikiTreeAPI.getPerson("helloWorld", person_id, ["FirstName"])`
-   Grab the first name from the returned data: `const name = personData["_data"]["FirstName"]`
-   Show "Hello" and the name in the container: `` document.querySelector(container_selector).innerText = `Hello, ${name}` ``

Combining these, the final code in `helloWorld.js` should look like this:

```js
window.HelloWorldView = class HelloWorldView extends View {
    meta() {
        return {
            title: "Hello World",
            description: "A simple example app.",
        };
    }

    async init(container_selector, person_id) {
        const personData = await WikiTreeAPI.getPerson("helloWorld", person_id, ["FirstName"]);
        const name = personData["_data"]["FirstName"];
        document.querySelector(container_selector).innerText = `Hello, ${name}`;
    }
};
```

If you save an upload the code to your directory on your apps account, you should now see an app in the dropdown titled "Hello World", which shows "Hello, Name" on the screen.

## Requesting to add your code to the shared repo

Now that your feature is finished, you want that feature be added to the shared code repository on GitHub.

In the terminal, type `git status`. This will show you which files have been changed.

Since we want to include all the files that have been changed, type `git add .`.

Now you want to commit the changes with a short message about what was changed. Type `git commit -m "Add Hello World app."`.

Now you want to add those changes to your GitHub repository. Type `git push --set-upstream origin helloWorld`. This will upload the code to your repository under the branch "helloWorld".

If you go to your GitHub repository, you can now access the "helloWorld" branch in the dropdown on the left.

Once you are viewing that branch, you should see a section that says "This branch is X commits ahead of wikitree/wikitree-dynamic-tree:main." and a button that says "Contribute".

Click the "Contribute" button, and you will be taken to a form where you can fill out more information about your app. If this were an actual app that should be added to the code, you would press the "Create pull request" button to request that the maintainers view your code and add it to Tree Apps. But it isn't necessary for this tutorial.

## Additional Info

If you ran into any trouble during this tutorial, feel free to ask for help in the [WikiTree Discord](https://www.wikitree.com/wiki/Help:Discord), the [WikiTree Apps Project Google Group](https://groups.google.com/forum/#!forum/wikitreeapps), or in [G2G](https://www.wikitree.com/g2g/) with the `wt_apps` tag.

You can also practice your GitHub skills by improving this tutorial!
