# Contributing to the WikiTree Dynamic Tree Application

## Introduction

The WikiTree Dynamic Tree viewer is an application for viewing trees, charts, ancestor lists, etc. from the world [single family tree](https://www.wikitree.com/wiki/Help:Collaborative_Family_Tree). The goal is to have many views, where each view is created and maintained by one or a few individual volunteers, but they are connected through the dynamic tree for easy switching between views. This project and the views it contains, are open source on [GitHub](https://github.com/wikitree/wikitree-dynamic-tree) so that they can live on past their original creators, and in case anyone else can help improve on them.

The WikiTree team has created a base/core view, which is a forked family tree graph that can be scrolled, zoomed, and expanded dynamically. You can see this in action on the [Apps server](https://apps.wikitree.com/apps/wikitree-dynamic-tree/). The code for that view can be copied to use as a starting point for a new one, or an entirely new view can be created and integrated into the view selection.

There are several places to share ideas and questions with other developers:

-   The WikiTree [G2G forum](https://www.wikitree.com/g2g/)
-   The WikiTree Apps [Google Group](https://groups.google.com/g/WikiTreeApps/)
-   The WikiTree [GitHub](https://github.com/wikitree/wikitree-dynamic-tree/)
-   The WikiTree [Discord](https://discord.gg/9EMSdccnn3)

## Getting started

### Sign up

If you haven't already, the first thing you should do is sign up at [WikiTree](https://wikitree.com/). Registration is free, and will enable you to start contributing your family tree content.

We're using [GitHub](https://github.com/wikitree/wikitree-dynamic-tree/) to collaborate on the dynamic tree viewer application. In order to create your own fork and submit pull requests to merge your contributions into the shared application, you'll need to create an account.

You may also want to request a login for the WikiTree Apps server. This provides hosted space on apps.wikitree.com for your application, whether it's a new view for the dynamic tree viewer, or something completely new. We have a copy of the [dynamic tree](https://apps.wikitree.com/apps/wikitree-dynamic-tree]) running on Apps, as well as examples of the [WikiTree API](https://apps.wikitree.com/apps/wikitree-api-examples/) (which we use to gather data for the dynamic tree viewer). You can develop your code locally or in your own hosted space, but you'll have to deal with [CORS issues](#dealing-with-cors).

### Get the code

Once you have your accounts, it's time to grab the [code](https://github.com/wikitree/wikitree-dynamic-tree/). You can download the code (via zip or git clone) to experiment with locally. But if you want to contribute back to the collaborative WikiTree project, you'll want to create your own [fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Then you can check out that repo locally for work:

`git clone https://github.com/<your github id>/wikitree-dynamic-tree.git`

This will give you a copy of the current WikiTree Dynamic Tree project. The index.html is the page to view the tree(s). The file Tree.js contains the launcher that switches between the different views. Individual views are stored in subdirectories inside the "views/" directory.

## Create a new view

### Consider making a branch

To create your new view, you may want to start with a separate GitHub branch. This lets you proceed with making your changes without any impact on other work. You'll be able to switch back to "main" to see the current set of unmodified views (and pull down any updates since you cloned the repository). For a "newView" branch, you can use:

`git checkout -b newView`

### Check the WikiTree codestyle

Before you start check [WikiTree codestyle](/docs/codestyle.md) and optionally set your editor to follow our formatting rules. The life will be much easier for everybody, especially when checking diffs of your changes at Github ;-).

### Create some new files for your project

1. Create a new subdirectory (e.g. `views/newView/`) inside `views/` to hold the new code
1. Create `views/newView/newView.js`

    - in the file create new structure

        `[class based]` Create descendant of View class and override method

        `meta`: use you own title, description and docs

        `init`: use your own implementation of view

        e.g.

        ```js
        class NewView extends View {
            meta() {
                return {
                    // short title - will be in select control
                    title: "Profile Timeline",
                    // some longer description or usage
                    description: "",
                    // link pointing at some webpage with documentation
                    docs: "",
                };
            }

            init(container_selector, person_id) {
                // do whathever you want there
                // to showcase your awesome view, e.g.
                document.querySelector(
                    container_selector
                ).innerHTML = `<p>WikiTree ID of selected person is: ${person_id}</p>`;
            }
        }
        ```

        or

        `[prototype based]` Create similar structure as in class based approach and add following code into the constructor:

        ```js
        Object.assign(this, this?.meta()); // this will spread object into object fields for easier access
        ```

        alternativelly, you can create those fields directly in constructor, e.g.: this.title = "Template view"

1. link your new script file in `<head>` section of the `index.html` and register your new view in `ViewRegistry` in index.js, e.g.

    ```js
    new ViewRegistry(
        {
            "wt-dynamic-tree": new WikiTreeDynamicTreeViewer(),

            // ...

            "new-view": new NewView(), // <-- your new view
        },
        new SessionManager(WikiTreeAPI, loginManager)
    ).render();
    ```

## Share your view

When your new view is ready to share, you can announce it on G2G, Discord, or the Apps email group. You can upload it to your account at apps.wikitree.com for everyone to check out. And you can submit a pull request from your fork into the main project to get it incorporated into code for everyone to share.

## Dealing with CORS

Cross-origin resource sharing ([CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)) is a security feature of web browsers, to restrict what code can be executed. By default, Ajax requests for data to a hostname other than the one on which the page is viewed are denied. CORS provides a way for the browser to know whether these requests should be allowed. Because the WikiTree API uses credentials (to provide access to privacy-limited content), it does not have an "allow all" wildcard for the Access-Control-Allow-Origin header. This basically means that if you run the dynamic tree viewer on your local computer or in your own hosted space, you'll get errors when it tries to get data from the API.

```
Access to XMLHttpRequest at 'https://api.wikitree.com/api.php' from origin 'null' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

One way to deal with this is to put your work up at apps.wikitree.com. Requests from the Apps hostname are permitted at the API, so CORS restrictions are satisfied. IDEs like Visual Studio Code and Sublime (and Notepad++) have features or plugins to facilitate easy or automatic upload of saved content, which lets you work locally but view through apps.wikitree.com.

Other workarounds include:

-   A Chrome extension like [Moesif CORS](https://chrome.google.com/webstore/detail/moesif-origin-cors-change/digfbfaphojjndkpccljibejjbppifbc)
-   CORS Anywhere Proxy: [Public demo](https://cors-anywhere.herokuapp.com/corsdemo) / [Example usage](https://stackblitz.com/edit/wikitree-getperson2?file=index.ts)

## Prettier

The project uses [Prettier](https://prettier.io/) to format the code.

The settings the project uses are stored in the [.prettierrc](/.prettierrc) file.

### Installing Prettier

The general installation instructions can be viewed at the [Prettier Docs](https://prettier.io/docs/en/install.html).

#### Visual Studio Code

To install Prettier in [Visual Studio Code](https://code.visualstudio.com/):

-   Go to `View > Extensions`
-   Search for "Prettier - Code formatter"
-   Select the "Install" button

To set it up so it formats on save:

-   Go to `File > Preferences > Settings`
-   Search for "Default Formatter" and select "Prettier - Code formatter" in the dropdown
-   Search for "Format On Save" and make sure the checkbox is checked

It will use the settings in the `.prettierrc` file in the repository.

### Using Prettier

If you've set it up so it formats on save, you don't have to do anything else.

You can have prettier format a single file by using:

```
npx prettier --write your_file_name
```

If you haven't installed Prettier or are using the VS Code extension, you may be asked to install it when using the above command.

## Other potentially useful tools

-   [WikiTree API](https://github.com/wikitree/wikitree-api) - documentation of available API functions
-   [WikiTree JS](https://github.com/PeWu/wikitree-js) - JavaScript to access the API
-   [Markdown viewer](https://chrome.google.com/webstore/detail/markdown-viewer/ckkdlimhmcjmikdlpkmbgfkaikojcbjk) - Chrome extension to view Markdown (.md files in project documentation)
-   [JSON viewer](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) - Chrome extension to view JSON, like the output from the WikiTree API
-   [WikiTree Styles](https://www.wikitree.com/css/examples.html) - Some examples of CSS styles/colors/etc. for wikitree.com
