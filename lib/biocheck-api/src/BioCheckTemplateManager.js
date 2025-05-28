/*
The MIT License (MIT)

Copyright (c) 2025 Kathryn J Knight

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

/* **********************************************************************************
 * *****************************    WARNING    **************************************
 *
 * This class is used in the BioCheck app and in the WikiTree Dynamic Tree.
 * Ensure that any changes do not bring in components 
 * that are not supported in each of these environments.
 *
 * **********************************************************************************
 * ******************************************************************************** */

import { theSourceRules } from "./SourceRules.js";

/**
 * BioCheck Template Manager
 */
export class BioCheckTemplateManager {
  constructor() {
  } 

  /**
   * Load the template data from WikiTree Plus.
   * use this method to wait for the load to complete
   * Send the templates into theSourceRules, which is a singleton.
   * This only needs to be done once, at initialization.
   *
   * This can take some time. You can instead use loadPrep to get
   * a promise and then await loadTemplates using that promise if
   * there is other initialization to be performed.
   *
   * @throws error getting response
   */
  async load() {
    await this.#loadTemplates();
  }
  /*
  * Do the actual load separately so we can wait for this synchronously
  * The problem with this is that it can take a long time. Can we instead
  * be asynchronous in WBE and TreeApps and wait before user clicks in the App?
  */
  async #loadTemplates() {
    try {
      let url = "https://plus.wikitree.com/chrome/templatesExp.json?appid=bioCheck";
      let fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        console.log("Error " + fetchResponse.status);
        throw('Error loading templates');
      } else {
        const jsonData = await fetchResponse.json();
        // since you cannot do async from theSourceRules constructor
        theSourceRules.loadTemplates(jsonData.templates);
      }
      return fetchResponse;
    } catch (e) {
      console.log('Error loading templates ' + e);
      throw('Error loading templates');
    }
  }

  /** 
  * Send request to load templates from WT+
  * @return promise for use with loadTemplates
  * @throws error getting response
  */
  loadPrep() {
    try {
      let url = "https://plus.wikitree.com/chrome/templatesExp.json?appid=bioCheck";
      let p = fetch(url);
      return p;
    } catch (e) {
      console.log('Error loading templates ' + e);
      throw('Error loading templates');
    }
  }
  /** 
  * load Templates - wait for load to complete
  * @param p promise returned from loadPrep
  * @throws error getting response
  */
  async loadTemplates(p) {
    try {
      let fetchResponse = await p;
      if (!fetchResponse.ok) {
        console.log("Error " + fetchResponse.status);
        throw('Error loading templates');
      } else {
        const jsonData = await fetchResponse.json();
        // since you cannot do async from theSourceRules constructor
        theSourceRules.loadTemplates(jsonData.templates);
      }
      return fetchResponse;
    } catch (e) {
      console.log('Error loading templates ' + e);
      throw('Error loading templates');
    }
  }
}
