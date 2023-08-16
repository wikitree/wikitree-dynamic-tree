/*
The MIT License (MIT)

Copyright (c) 2023 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { theSourceRules } from "./SourceRules.js";

/**
 * BioCheck Template Manager
 */
export class BioCheckTemplateManager {
  constructor() {
  } 

  /**
   * Load the template data from WikiTree Plus.
   * Send the templates into theSourceRules, which is a singleton.
   * This only needs to be done once, at initialization.
   */
  async load() {
    await this.#loadTemplates();
  }
  /*
  * Do the actual load separately so we can wait for this synchronously
  */
  async #loadTemplates() {
    try {
      let url = "https://plus.wikitree.com/chrome/templatesExp.json?appid=bioCheck";
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        console.log("Error " + fetchResponse.status);
      } else {
        const jsonData = await fetchResponse.json();
        // since you cannot do async from theSourceRules constructor
        theSourceRules.loadTemplates(jsonData.templates);
      }
      return fetchResponse;
    } catch (e) {
      console.log('error ' + e);
    }
  }

}
