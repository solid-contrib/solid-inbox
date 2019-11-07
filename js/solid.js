require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
/**
 * Provides a simple configuration object for Solid web client and other
 * modules.
 * @module config
 */
module.exports = {
  /**
   * Default authentication endpoint
   */
  authEndpoint: 'https://databox.me/',

  /**
   * Default RDF parser library
   */
  parser: 'rdflib',

  /**
   * Default proxy URL for servicing CORS requests
   */
  proxyUrl: 'https://databox.me/,proxy?uri={uri}',

  /**
   * Default signup endpoints (list of identity providers)
   */
  signupEndpoint: 'https://solid.github.io/solid-idps/',

  /**
   * Default height of the Signup popup window, in pixels
   */
  signupWindowHeight: 600,

  /**
   * Default width of the Signup popup window, in pixels
   */
  signupWindowWidth: 1024,

  /**
   * Timeout for web/ajax operations, in milliseconds
   */
  timeout: 50000
}

},{}],2:[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) 2015 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Solid.js is a Javascript library for Solid applications. This library currently
depends on rdflib.js. Please make sure to load the rdflib.js script before
loading solid.js.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/
*/
'use strict'
/**
 * Provides Solid methods for WebID authentication and signup
 * @module auth
 */
module.exports.currentUser = currentUser
module.exports.listen = listen
module.exports.login = login
module.exports.signup = signup

var webClient = require('./web')

/**
 * Returns the WebID of the current user (by doing a login()/HEAD request to
 * the current page). Convenience method, useful for standalone apps that aren't
 * wrapping any resource.
 * @method currentUser
 * @return {String} WebID of the current user or `null` if none detected
 */
function currentUser () {
  if (typeof window === 'undefined') {
    return null  // only works in the browser
  }
  var currentPageUrl = window.location.href
  return login(currentPageUrl)
    .catch(function (reason) {
      // console.log('Detecting current user failed: %o', reason)
      return null
    })
}

/**
 * Sets up an event listener to monitor login messages from child window/iframe
 * @method listen
 * @static
 * @return {Promise<String>} Event listener promise, resolves to user's WebID
 */
function listen () {
  var promise = new Promise(function (resolve, reject) {
    var eventMethod = window.addEventListener
      ? 'addEventListener'
      : 'attachEvent'
    var eventListener = window[eventMethod]
    var messageEvent = eventMethod === 'attachEvent'
      ? 'onmessage'
      : 'message'
    eventListener(messageEvent, function (e) {
      var u = e.data
      if (u.slice(0, 5) === 'User:') {
        var user = u.slice(5, u.length)
        if (user && user.length > 0 && user.slice(0, 4) === 'http') {
          return resolve(user)
        } else {
          return reject(user)
        }
      }
    }, true)
  })

  return promise
}

/**
 * Performs a Solid login() via an XHR HEAD operation.
 * (Attempts to find the current user's WebID from the User header, if
 *   already authenticated.)
 * @method login
 * @static
 * @param [url] {String} Location of a Solid server or container at which the
 *   user might be authenticated.
 *   Defaults to: current page location
 * @param [alternateAuthUrl] {String} URL of an alternate/default auth endpoint.
 *   Defaults to `config.authEndpoint`
 * @return {Promise<String>} XHR HEAD operation promise, resolves to user's WebID
 */
function login (url, alternateAuthUrl) {
  var defaultAuthEndpoint = require('../config').authEndpoint
  url = url || window.location.origin + window.location.pathname
  alternateAuthUrl = alternateAuthUrl || defaultAuthEndpoint
  // First, see if user is already logged in (do a quick HEAD request)
  return webClient.head(url)
    .then(function (solidResponse) {
      if (solidResponse.isLoggedIn()) {
        return solidResponse.user
      } else {
        // If not logged in, try logging in at an alternate endpoint
        return webClient.head(alternateAuthUrl)
          .then(function (solidResponse) {
            // Will return an empty string is this login also fails
            return solidResponse.user
          })
      }
    })
}

/**
 * Opens a signup popup window, sets up `listen()`.
 * @method signup
 * @static
 * @param signupUrl {String} Location of a Solid server for user signup.
 * @return {Promise<String>} Returns a listener promise, resolves with signed
 *   up user's WebID.
 */
function signup (signupUrl) {
  var config = require('../config')
  signupUrl = signupUrl || config.signupEndpoint
  var width = config.signupWindowWidth
  var height = config.signupWindowHeight
  // set borders
  var leftPosition = (window.screen.width / 2) - ((width / 2) + 10)
  // set title and status bars
  var topPosition = (window.screen.height / 2) - ((height / 2) + 50)
  var windowTitle = 'Solid signup'
  var windowUrl = signupUrl + '?origin=' +
    encodeURIComponent(window.location.origin)
  var windowSpecs = 'resizable,scrollbars,status,width=' + width + ',height=' +
    height + ',left=' + leftPosition + ',top=' + topPosition
  window.open(windowUrl, windowTitle, windowSpecs)

  return new Promise(function (resolve, reject) {
    listen().then(function (webid) {
      return resolve(webid)
    }).catch(function (err) {
      return reject(err)
    })
  })
}

},{"../config":1,"./web":19}],3:[function(require,module,exports){
'use strict'
/**
 * Provides Solid helper functions involved with parsing a user's WebId profile.
 * @module identity
 */
module.exports.discoverWebID = discoverWebID
module.exports.getProfile = getProfile
module.exports.loadExtendedProfile = loadExtendedProfile

var graphUtil = require('./util/graph-util')
var webUtil = require('./util/web-util')
var webClient = require('./web')
var SolidProfile = require('./solid/profile')
var vocab = require('./vocab')

/**
 * Discovers a user's WebId (URL) starting from the account/domain URL
 * @method discoverWebID
 * @param url {String} Location of a user's account or domain.
 * @throw {Error} Reason why the WebID could not be discovered
 * @return {Promise<uri>}
 */

function discoverWebID (url) {
  return new Promise(function (resolve, reject) {
    webClient.options(url)
      .then(function (meta) {
        var metaUrl = meta.meta
        if (metaUrl) {
          metaUrl = webUtil.absoluteUrl(url, metaUrl)
          webClient.getParsedGraph(metaUrl)
            .then(function (graph) {
              var webid = graph.any(undefined, vocab.solid('account'))
              if (webid && webid.uri) {
                resolve(webid.uri)
              } else {
                throw new Error('Could not find a WebID matching the domain ' +
                url)
              }
            })
            .catch(function (err) {
              reject(err)
            })
        } else {
          throw new Error('Could not find a meta URL in the Link header')
        }
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

/**
 * Fetches a user's WebId profile, optionally follows `sameAs` etc links,
 *   and return a promise with a parsed SolidProfile instance.
 * @method getProfile
 * @param profileUrl {String} WebId or Location of a user's profile.
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @param [options.ignoreExtended=false] Do not load extended profile if true.
 * @return {Promise<SolidProfile>}
 */
function getProfile (profileUrl, options) {
  options = options || {}
  // Politely ask for Turtle formatted profiles
  options.headers = options.headers || {
    'Accept': 'text/turtle'
  }
  options.noCredentials = true  // profiles are always public
  // Load main profile
  return webClient.get(profileUrl, options)
    .then(function (response) {
      var contentType = response.contentType()
      if (!contentType) {
        throw new Error('Cannot parse profile without a Content-Type: header')
      }
      var parsedProfile = graphUtil.parseGraph(profileUrl, response.raw(),
        contentType)
      var profile = new SolidProfile(profileUrl, parsedProfile, response)
      profile.isLoaded = true
      if (options.ignoreExtended) {
        return profile
      } else {
        return loadExtendedProfile(profile, options)
      }
    })
}

/**
 * Loads the related external profile resources (all the `sameAs` and `seeAlso`
 * links, as well as Preferences), and appends them to the profile's
 * `parsedGraph`. Returns the profile instance.
 * @method loadExtendedProfile
 * @private
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadExtendedProfile (profile, options) {
  var links = profile.relatedProfilesLinks()
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        if (graph && graph.value) {
          profile.appendFromGraph(graph.value, graph.uri)
        }
      })
      return profile
    })
}

},{"./solid/profile":7,"./util/graph-util":12,"./util/web-util":16,"./vocab":18,"./web":19}],4:[function(require,module,exports){
'use strict'
/**
 * Provides miscelaneous meta functions (such as library version)
 * @module meta
 */
var lib = require('../package')

/**
 * Returns Solid.js library version (read from `package.json`)
 * @return {String} Lib version
 */
module.exports.version = function version () {
  return lib.version
}

},{"../package":26}],5:[function(require,module,exports){
'use strict'
/**
 * @module container
 */
module.exports = SolidContainer
var rdf = require('../util/rdf-parser').rdflib
var graphUtil = require('../util/graph-util')
var parseLinks = graphUtil.parseLinks
var vocab = require('../vocab')
var SolidResource = require('./resource')

/**
 * @class SolidContainer
 * @extends SolidResource
 * @constructor
 * @param uri {String}
 * @param response {SolidResponse}
 */
function SolidContainer (uri, response) {
  // Call parent constructor
  SolidResource.call(this, uri, response)

  /**
   * Hashmap of Containers within this container, keyed by absolute uri
   * @property containers
   * @type Object
   */
  this.containers = {}
  /**
   * List of URIs of all contents (containers and resources)
   * @property contentsUris
   * @type Array<String>
   */
  this.contentsUris = []

  /**
   * Hashmap of Contents that are just resources (not containers),
   * keyed by absolute uri
   * @property resources
   * @type Object
   */
  this.resources = {}

  if (response) {
    this.initFromResponse(this.uri, response)
  }
}
// SolidContainer.prototype object inherits from SolidResource.prototype
SolidContainer.prototype = Object.create(SolidResource.prototype)
SolidContainer.prototype.constructor = SolidContainer

/**
 * Extracts the contents (resources and sub-containers)
 * of the given graph and adds them to this container
 * @method appendFromGraph
 * @param parsedGraph {Graph}
 * @param graphUri {String}
 */
SolidContainer.prototype.appendFromGraph =
  function appendFromGraph (parsedGraph, graphUri) {
    // Set this container's types
    this.types = Object.keys(parsedGraph.findTypeURIs(rdf.sym(this.uri)))

    // Extract all the contents links (resources and containers)
    var contentsUris = parseLinks(parsedGraph, null, vocab.ldp('contains'))
    this.contentsUris = this.contentsUris.concat(contentsUris.sort())

    // Extract links that are just containers
    var containersLinks = parsedGraph.each(null, null, vocab.ldp('Container'))
    var self = this
    var container
    containersLinks.forEach(function (containerLink) {
      // Filter out . (the link to this directory)
      if (containerLink.uri !== self.uri) {
        container = new SolidContainer(containerLink.uri)
        container.types = Object.keys(parsedGraph.findTypeURIs(containerLink))
        self.containers[container.uri] = container
      }
    })
    // Now that containers are defined, all the rest are non-container resources
    var isResource
    var isContainer
    var resource
    contentsUris.forEach(function (link) {
      isContainer = link in self.containers
      isResource = link !== self.uri && !isContainer
      if (isResource) {
        resource = new SolidResource(link)
        resource.types = Object.keys(parsedGraph.findTypeURIs(rdf.sym(link)))
        self.resources[link] = resource
      }
    })
  }

/**
 * Returns a list of SolidResource or SolidContainer instances that match
 * a given type.
 * @method findByType
 * @param rdfClass {String}
 * @return {Array<SolidResource|SolidContainer>}
 */
SolidContainer.prototype.findByType = function findByType (rdfClass) {
  var matches = []
  var key
  var container
  for (key in this.containers) {
    container = this.containers[key]
    if (container.isType(rdfClass)) {
      matches.push(container)
    }
  }
  var resource
  for (key in this.resources) {
    resource = this.resources[key]
    if (resource.isType(rdfClass)) {
      matches.push(resource)
    }
  }
  return matches
}

/**
 * @method initFromResponse
 * @param uri {String}
 * @param response {SolidResponse}
 */
SolidContainer.prototype.initFromResponse =
  function initFromResponse (uri, response) {
    var contentType = response.contentType()
    if (!contentType) {
      throw new Error('Cannot parse container without a Content-Type: header')
    }
    var parsedGraph = graphUtil.parseGraph(uri, response.raw(),
      contentType)
    this.parsedGraph = parsedGraph
    this.appendFromGraph(parsedGraph, uri)
  }

/**
 * Is this a Container instance (vs a regular resource).
 * @return {Boolean}
 */
SolidResource.prototype.isContainer = function isContainer () {
  return true
}

/**
 * Returns true if there are no resources or containers inside this container.
 * @method isEmpty
 * @return {Boolean}
 */
SolidContainer.prototype.isEmpty = function isEmpty () {
  return this.contentsUris.length === 0
}


},{"../util/graph-util":12,"../util/rdf-parser":13,"../vocab":18,"./resource":8}],6:[function(require,module,exports){
'use strict'
/**
 * @module index-registration
 */
module.exports = IndexRegistration

/**
 * Represents a Solid Index registration (an entry in the Type Index Registry).
 * Returned in a list by `profile.typeRegistryForClass()`
 * @class IndexRegistration
 * @constructor
 * @param registrationUri {String} Absolute URI (with fragment identifier) of
 *   the registration (its location in the type index)
 * @param rdfClass {rdf.NamedNode} RDF Class for this registration
 * @param locationType {String} One of 'instance' or 'container'
 * @param locationUri {String} URI of the location containing resources of this
 *   type
 * @param isListed {Boolean} Is this registration in a listed or unlisted index
 */
function IndexRegistration (registrationUri, rdfClass, locationType,
                            locationUri, isListed) {
  /**
   * Is this a listed or unlisted registration
   * @property isListed
   * @type Boolean
   */
  this.isListed = isListed
  /**
   * Location type, one of 'instance' or 'container'
   * @property locationType
   * @type String
   */
  this.locationType = locationType
  /**
   * URI of the solid instance or container that holds resources of this type
   * @property locationUri
   * @type String
   */
  this.locationUri = locationUri
  /**
   * RDF Class for this registration
   * @property rdfClass
   * @type rdf.NamedNode
   */
  this.rdfClass = rdfClass
  /**
   * Absolute URI (with fragment identifier) of the registration
   * @property registrationUri
   * @type String
   */
  this.registrationUri = registrationUri
}

/**
 * Convenience method, returns true if this registration is of type
 * `solid:instanceContainer`
 * @method isContainer
 * @return {Boolean}
 */
IndexRegistration.prototype.isContainer = function isInstance () {
  return this.locationType === 'container'
}

/**
 * Convenience method, returns true if this registration is of type
 * `solid:instance`
 * @method isInstance
 * @return {Boolean}
 */
IndexRegistration.prototype.isInstance = function isInstance () {
  return this.locationType === 'instance'
}

},{}],7:[function(require,module,exports){
'use strict'
/**
 * @module profile
 */
module.exports = SolidProfile
var rdf = require('../util/rdf-parser').rdflib
var vocab = require('../vocab')
var typeRegistry = require('../type-registry')
var graphUtil = require('../util/graph-util')
var parseLinks = graphUtil.parseLinks

/**
 * Provides convenience methods for a WebID Profile.
 * Used by `identity.getProfile()`
 * @class SolidProfile
 * @constructor
 */
function SolidProfile (profileUrl, parsedProfile, response) {
  /**
   * Main Inbox resource for this profile (link and parsed graph)
   * @property inbox
   * @type Object
   */
  this.inbox = {
    uri: null,
    graph: null
  }
  /**
   * Has this profile been loaded? (Set in `identity.getProfile()`)
   * @property isLoaded
   * @type Boolean
   */
  this.isLoaded = false
  /**
   * Links to root storage containers (read/write dataspaces for this profile)
   * @property storage
   * @type Array<String>
   */
  this.storage = []
  /**
   * Listed (public) Type registry index (link and parsed graph)
   * @property typeIndexListed
   * @type Object
   */
  this.typeIndexListed = {
    uri: null,
    graph: null
  }
  /**
   * Unlisted (private) Type registry index (link and parsed graph)
   * @property typeIndexUnlisted
   * @type rdf.Object
   */
  this.typeIndexUnlisted = {
    uri: null,
    graph: null
  }
  /**
   * Parsed graph of the extended WebID Profile document.
   * Included the WebID profile, preferences, and related profile graphs
   * @property parsedGraph
   * @type rdf.Graph
   */
  this.parsedGraph = null
  /**
   * Profile preferences object (link and parsed graph).
   * Is considered a part of the 'Extended Profile'
   * @property preferences
   * @type Object
   */
  this.preferences = {
    uri: null,
    graph: null
  }
  /**
   * SolidResponse instance from which this profile object was created.
   * Contains the raw profile source, the XHR object, etc.
   * @property response
   * @type SolidResponse
   */
  this.response = response
  /**
   * Links to "see also" profile documents. Typically loaded immediately
   * after retrieving the initial WebID Profile document.
   * @property relatedProfiles
   * @type Object
   */
  this.relatedProfiles = {
    sameAs: [],
    seeAlso: []
  }
  /**
   * WebId URL (the `foaf:primaryTopic` of the profile document)
   * @property webId
   * @type String
   */
  this.webId = null

  if (!profileUrl) {
    return
  }
  /**
   * Location of the base WebID Profile document (minus the hash fragment).
   * @property baseProfileUrl
   * @type String
   */
  this.baseProfileUrl = (profileUrl.indexOf('#') >= 0)
    ? profileUrl.slice(0, profileUrl.indexOf('#'))
    : profileUrl

  if (parsedProfile) {
    this.initWebId(parsedProfile)
    this.appendFromGraph(parsedProfile, this.baseProfileUrl)
  }
}

/**
 * Update the profile based on a parsed graph, which can be either the
 * initial WebID profile, or the various extended profile graphs
 * (such as the seeAlso, sameAs and preferences links)
 * @method appendFromGraph
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @param profileUrl {String} URL of this particular parsed graph
 */
SolidProfile.prototype.appendFromGraph =
  function appendFromGraph (parsedProfile, profileUrl) {
    if (!parsedProfile) {
      return
    }
    this.parsedGraph = this.parsedGraph || rdf.graph()  // initialize if null
    // Add the graph of this parsedProfile to the existing graph
    graphUtil.appendGraph(this.parsedGraph, parsedProfile, profileUrl)

    var webId = rdf.sym(this.webId)
    var links

    // Add sameAs and seeAlso
    links = parseLinks(parsedProfile, null, vocab.owl('sameAs'))
    this.relatedProfiles.sameAs = this.relatedProfiles.sameAs.concat(links)

    links = parseLinks(parsedProfile, null, vocab.rdfs('seeAlso'))
    this.relatedProfiles.seeAlso = this.relatedProfiles.seeAlso.concat(links)

    // Add preferencesFile link (singular). Note that preferencesFile has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.preferences.uri) {
      this.preferences.uri = parseLink(parsedProfile, webId,
        vocab.pim('preferencesFile'))
    }
    // Init inbox (singular). Note that inbox has
    // Write-Once semantics -- it's initialized from public profile, but
    // cannot be overwritten by related profiles
    if (!this.inbox.uri) {
      this.inbox.uri = parseLink(parsedProfile, webId,
        vocab.ldp('inbox'))
    }

    // Add storage
    links = parseLinks(parsedProfile, webId, vocab.pim('storage'))
    this.storage =
      this.storage.concat(links)

    // Add links to Listed and Unlisted Type Indexes.
    // Note: these are just the links.
    // The actual index files will be loaded and parsed
    //   in `profile.loadTypeRegistry()`)
    if (!this.typeIndexListed.uri) {
      this.typeIndexListed.uri = parseLink(parsedProfile, webId,
        vocab.solid('publicTypeIndex'))
    }
    if (!this.typeIndexUnlisted.uri) {
      this.typeIndexUnlisted.uri = parseLink(parsedProfile, webId,
        vocab.solid('privateTypeIndex'))
    }
  }

/**
 * Extracts the WebID from a parsed profile graph and initializes it.
 * Should only be done once (when creating a new SolidProfile instance)
 * @method initWebId
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 */
SolidProfile.prototype.initWebId = function initWebId (parsedProfile) {
  if (!parsedProfile) {
    return
  }
  try {
    this.webId = extractWebId(this.baseProfileUrl, parsedProfile).uri
  } catch (e) {
    throw new Error('Unable to parse WebID from profile: ' + e)
  }
}

/**
 * Returns an array of related external profile links (sameAs and seeAlso and
 * Preferences files)
 * @method relatedProfilesLinks
 * @return {Array<String>}
 */
SolidProfile.prototype.relatedProfilesLinks = function relatedProfilesLinks () {
  var links = []
  links = links.concat(this.relatedProfiles.sameAs)
    .concat(this.relatedProfiles.seeAlso)
  if (this.preferences.uri) {
    links = links.concat(this.preferences.uri)
  }
  return links
}

/**
 * Returns true if the profile has any links to root storage
 * @method hasStorage
 * @return {Boolean}
 */
SolidProfile.prototype.hasStorage = function hasStorage () {
  return this.storage &&
    this.storage.length > 0
}

/**
 * Convenience method to init the type index registry. Usage:
 *
 *   ```
 *   Solid.getProfile(url, options)
 *     .then(function (profile) {
 *       return profile.initTypeRegistry(containerUrl, options)
 *     })
 *   ```
 * @method initTypeRegistry
 * @param containerUrl {String} The URL of the container for index documents
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {SolidProfile}
 */
SolidProfile.prototype.initTypeRegistry = function initTypeRegistry (containerUrl,
                                                                      options) {
  return typeRegistry.initTypeRegistry(this, containerUrl, options)
}

/**
 * Convenience method to load the type index registry. Usage:
 *
 *   ```
 *   Solid.getProfile(url, options)
 *     .then(function (profile) {
 *       return profile.loadTypeRegistry(options)
 *     })
 *   ```
 * @method loadTypeRegistry
 * @param [options] Options hashmap (see Solid.web.solidRequest() function docs)
 * @return {SolidProfile}
 */
SolidProfile.prototype.loadTypeRegistry = function loadTypeRegistry (options) {
  return typeRegistry.loadTypeRegistry(this, options)
}

/**
 * Adds a parsed type index graph to the appropriate type registry (public
 *   or private).
 * @method addTypeRegistry
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @param uri {String} Location of the type registry index document
 */
SolidProfile.prototype.addTypeRegistry = function addTypeRegistry (graph, uri) {
  // Is this a public type registry?
  if (typeRegistry.isListedTypeIndex(graph)) {
    if (!this.typeIndexListed.graph) {  // only initialize once
      this.typeIndexListed.uri = uri
      this.typeIndexListed.graph = graph
    }
  } else if (typeRegistry.isUnlistedTypeIndex(graph)) {
    if (!this.typeIndexUnlisted.graph) {
      this.typeIndexUnlisted.uri = uri
      this.typeIndexUnlisted.graph = graph
    }
  } else {
    throw new Error('Attempting to add an invalid type registry index')
  }
}

/**
 * Returns lists of registry entries for a given RDF Class.
 * @method typeRegistryForClass
 * @param rdfClass {rdf.NamedNode} RDF Class symbol
 * @return {Array<IndexRegistration>}
 */
SolidProfile.prototype.typeRegistryForClass =
  function typeRegistryForClass (rdfClass) {
    return typeRegistry.typeRegistryForClass(this, rdfClass)
  }

/**
 * Registers a given RDF class in the user's type index registries, so that
 * other applications can discover it.
 * @method registerType
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
 *   registered to. (Example: Registering Address books in
 *   `https://example.com/contacts/`)
 * @param [locationType='container'] {String} Either 'instance' or 'container',
 *   defaults to 'container'
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.registerType =
  function (rdfClass, location, locationType, isListed) {
    return typeRegistry.registerType(this, rdfClass, location, locationType,
      isListed)
  }

/**
 * Removes a given RDF class from the user's type index registry
 * @method unregisterType
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
SolidProfile.prototype.unregisterType = function (rdfClass, isListed, location) {
  return typeRegistry.unregisterType(this, rdfClass, isListed, location)
}

/**
 * Extracts the WebID symbol from a parsed profile graph.
 * @method extractWebId
 * @param baseProfileUrl {String} Profile URL, with no hash fragment
 * @param parsedProfile {rdf.IndexedFormula} RDFLib-parsed user profile
 * @return {rdf.NamedNode} WebID symbol
 */
function extractWebId (baseProfileUrl, parsedProfile) {
  var subj = rdf.sym(baseProfileUrl)
  var pred = vocab.foaf('primaryTopic')
  var match = parsedProfile.any(subj, pred)
  return match
}

/**
 * Extracts the first URI from a parsed graph that matches parameters
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.NamedNode}
 * @param predicate {rdf.NamedNode}
 * @param object {rdf.NamedNode}
 * @param source {rdf.NamedNode}
 * @return {String} URI that matches the parameters
 */
function parseLink (graph, subject, predicate, object, source) {
  var first = graph.any(subject, predicate, object, source)
  if (first) {
    return first.uri
  } else {
    return null
  }
}

},{"../type-registry":11,"../util/graph-util":12,"../util/rdf-parser":13,"../vocab":18}],8:[function(require,module,exports){
'use strict'
/**
 * @module resource
 */

/**
 * Represents a Solid / LDP Resource (currently used when listing
 * SolidContainer resources)
 * @class SolidResource
 * @constructor
 */
module.exports = SolidResource

function SolidResource (uri, response) {
  /**
   * Short name (page/filename part of the resource path),
   * derived from the URI
   * @property name
   * @type String
   */
  this.name = null
  /**
   * Parsed graph of the contents of the resource
   * @property parsedGraph
   * @type Graph
   */
  this.parsedGraph = null
  /**
   * Optional SolidResponse object from which this resource was initialized
   * @property response
   * @type SolidResponse
   */
  this.response = response
  /**
   * List of RDF Types (classes) to which this resource belongs
   * @property types
   * @type Array<String>
   */
  this.types = []
  /**
   * Absolute url of the resource
   * @property url
   * @type String
   */
  this.uri = uri

  if (response) {
    if (response.url !== uri) {
      // Override the given url (which may be relative) with that of the
      // response object (which will be absolute)
      this.uri = response.url
    }
  }
  this.initName()
}

/**
 * Initializes the short name from the url
 * @method initName
 */
SolidResource.prototype.initName = function initName () {
  if (!this.uri) {
    return
  }
  // Split on '/', use the last fragment
  var fragments = this.uri.split('/')
  this.name = fragments.pop()
  if (!this.name && fragments.length > 0) {
    // URI ended in a '/'. Try again.
    this.name = fragments.pop()
  }
}

/**
 * Is this a Container instance (vs a regular resource).
 * (Is overridden in the subclass, `SolidContainer`)
 * @return {Boolean}
 */
SolidResource.prototype.isContainer = function isContainer () {
  return false
}

/**
 * Returns true if this a given type matches this resource's types
 * @method isType
 * @param rdfClass {String}
 * @return {Boolean}
 */
SolidResource.prototype.isType = function isType (rdfClass) {
  return this.types.indexOf(rdfClass) !== -1
}

},{}],9:[function(require,module,exports){
'use strict'
/**
* @module response
*/
module.exports = SolidResponse

var webUtil = require('../util/web-util')
var graphUtil = require('../util/graph-util')  // Used by .parsedGraph()

/**
* Provides a wrapper around an XHR response object, and adds several
* Solid-specific parsed fields (link headers, allowed verbs, etc)
* @class SolidResponse
* @constructor
* @param xhrResponse {XMLHttpRequest} Result of XHR operation
* @param method {String} HTTP verb for the original request
*/
function SolidResponse (xhrResponse, method) {
  if (!xhrResponse) {
    this.xhr = null
    this.user = ''
    this.method = null
    this.types = []
    this.graph = null
    return
  }
  /**
   * Hashmap of parsed `Link:` headers. Example:
   *
   *   ```
   *   {
   *     acl: [ 'resourceName.acl' ],
   *     describedBy: [ 'resourceName.meta' ],
   *     type: [
   *       'http://www.w3.org/ns/ldp#RDFResource',
   *       'http://www.w3.org/ns/ldp#Resource'
   *     ]
   *   }
   *   ```
   * @property linkHeaders
   * @type Object
   */
  var linkHeader = xhrResponse.getResponseHeader('Link')
  this.linkHeaders = webUtil.parseLinkHeader(linkHeader) || {}

  if (method) {
    method = method.toLowerCase()
  } else {
    method = ''
  }
  /**
   * HTTP verb for the original request (GET, PUT, etc)
   * @property method
   * @type String
   */
  this.method = method

  /**
   * Name of the corresponding `.acl` resource
   * @property acl
   * @type String
   */
  this.acl = this.linkHeaders['acl']
  if (this.acl) {
    this.acl = this.acl[0]  // Extract the single .acl link
  }
  /**
   * Hashmap of HTTP methods/verbs allowed by the server.
   * (If a verb is not allowed, it's not included.)
   * Example:
   *   ```
   *   {
   *     'get': true,
   *     'put': true
   *   }
   *   ```
   * @property allowedMethods
   * @type Object
   */
  this.allowedMethods = this.parseAllowedMethods(xhrResponse, method)

  /**
   * Cache of the parsed graph of xhr.response,
   * lazy-initialized when you call `response.parsedGraph()`
   * @property graph
   * @type {IndexedFormula}
   */
  this.graph = null

  /**
   * Name of the corresponding `.meta` resource
   * @property meta
   * @type String
   */
  this.meta = this.linkHeaders['meta'] || this.linkHeaders['describedBy']
  if (this.meta) {
    this.meta = this.meta[0]  // Extract the single .meta link
  }
  /**
   * LDP Types for the resource.
   * Example: [
   *   'http://www.w3.org/ns/ldp#Resource',
   *   'http://www.w3.org/ns/ldp#RDFResource'
   * ]
   * @property types
   * @type Array<String>
   */
  this.types = this.linkHeaders.type || []
  /**
  * URL of the resource created or retrieved
  * @property url
  * @type String
  */
  this.url = xhrResponse.getResponseHeader('Location') || xhrResponse.responseURL
  /**
   * WebID URL of the currently authenticated user (empty string if none)
   * @property user
   * @type String
   */
  this.user = xhrResponse.getResponseHeader('User') || ''
  /**
   * URL of the corresponding websocket instance, for this resource
   * Example: `wss://example.org/blog/hello-world`
   * @property websocket
   * @type String
   */
  this.websocket = xhrResponse.getResponseHeader('Updates-Via') || ''
  /**
   * Raw XHR response object
   * @property xhr
   * @type XMLHttpRequest
   */
  this.xhr = xhrResponse
}

/**
 * Returns the Content-Type of the response (or null if no response
 * is present)
 * @method contentType
 * @return {String|Null}
 */
SolidResponse.prototype.contentType = function contentType () {
  if (this.xhr) {
    return this.xhr.getResponseHeader('Content-Type')
  } else {
    return null
  }
}

/**
 * Returns true if the resource exists (not a 404)
 * @method exists
 * @return {Boolean}
 */
SolidResponse.prototype.exists = function exists () {
  return this.xhr && this.xhr.status >= 200 && this.xhr.status < 400
}

/**
 * Is this a Container instance (vs a regular resource).
 * @return {Boolean}
 */
SolidResponse.prototype.isContainer = function isContainer () {
  return this.isType('http://www.w3.org/ns/ldp#Container') ||
    this.isType('http://www.w3.org/ns/ldp#BasicContainer')
}

/**
 * Returns true if the user is logged in with the server
 * @method isLoggedIn
 * @return {Boolean}
 */
SolidResponse.prototype.isLoggedIn = function isLoggedIn () {
  return this.user // && this.user.slice(0, 4) === 'http'
}

/**
 * Returns true if this a given type matches this resource's types
 * @method isType
 * @param rdfClass {String}
 * @return {Boolean}
 */
SolidResponse.prototype.isType = function isType (rdfClass) {
  return this.types.indexOf(rdfClass) !== -1
}

/**
 * In case that this was preflight-type request (OPTIONS or POST, for example),
 * parses and returns the allowed methods for the resource (for the current
 * user).
 * @method parseAllowedMethods
 * @param xhrResponse {XMLHttpRequest}
 * @param method {String} HTTP verb for the original request
 * @return {Object} Hashmap of the allowed methods
 */
SolidResponse.prototype.parseAllowedMethods =
  function parseAllowedMethods (xhrResponse, method) {
    if (method === 'get') {
      // Not a preflight request
      return {}
    } else {
      return webUtil.parseAllowedMethods(
        xhrResponse.getResponseHeader('Allow'),
        xhrResponse.getResponseHeader('Accept-Patch')
      )
    }
  }

/**
 * Returns the parsed graph of the response (lazy-initializes it if it's not
 * present)
 * @method parsedGraph
 * @return {IndexedFormula}
 */
SolidResponse.prototype.parsedGraph = function parsedGraph() {
  if (!this.graph) {
    this.graph = graphUtil.parseGraph(this.url, this.raw(), this.contentType())
  }
  return this.graph
}

/**
 * Returns the raw XHR response (or null if absent)
 * @method raw
 * @return {Object|Null}
 */
SolidResponse.prototype.raw = function raw () {
  if (this.xhr) {
    return this.xhr.response
  } else {
    return null
  }
}

},{"../util/graph-util":12,"../util/web-util":16}],10:[function(require,module,exports){
'use strict'
/**
 * Provides Web API helpers dealing with a user's online / offline status.
 * @module status
 */
module.exports.isOnline = isOnline
module.exports.onOffline = onOffline
module.exports.onOnline = onOnline

/**
 * Returns a user's online status (true if user is on line)
 * @method isOnline
 * @static
 * @return {Boolean}
 */
function isOnline () {
  return window.navigator.onLine
}

/**
 * Adds an even listener to trigger when the user goes offline.
 * @method onOffline
 * @static
 * @param callback {Function} Callback to invoke when user goes offline.
 */
function onOffline (callback) {
  window.addEventListener('offline', callback, false)
}

/**
 * Adds an even listener to trigger when the user comes online.
 * @method onOnline
 * @static
 * @param callback {Function} Callback to invoke when user comes online
 */
function onOnline (callback) {
  window.addEventListener('online', callback, false)
}

},{}],11:[function(require,module,exports){
'use strict'
/**
 * Provides Solid helper functions involved with loading the Type Index
 * Registry files, and with registering resources with them.
 * @module type-registry
 */
module.exports.initTypeRegistry = initTypeRegistry
module.exports.loadTypeRegistry = loadTypeRegistry
module.exports.isUnlistedTypeIndex = isUnlistedTypeIndex
module.exports.isListedTypeIndex = isListedTypeIndex
module.exports.registerType = registerType
module.exports.unregisterType = unregisterType
module.exports.typeRegistryForClass = typeRegistryForClass

// var graphUtil = require('./util/graph-util')
var IndexRegistration = require('./solid/index-registration')
var rdf = require('./util/rdf-parser').rdflib
var webClient = require('./web')
// var SolidProfile = require('./solid/profile')
var util = require('./util/web-util.js')
var graphUtil = require('./util/graph-util.js')
var vocab = require('./vocab')

/**
 * Initializes a user's WebID profile with the type index registry.
 * @param profile {SolidProfile} User's WebID profile
 * @param container {Strong} The URL of the container for index documents
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 *   where the type indexes will be created
 * @return {<SolidProfile>}
 */
function initTypeRegistry (profile, containerUrl, options) {
  // Use same path as the WebID profile document if containerUrl is not provided
  containerUrl = containerUrl || profile.webId.replace(/\\/g, '/')
                                              .replace(/\/[^\/]*\/?$/, '') + '/'
  if (!containerUrl) {
    throw new Error('No location specified for type index creation')
  }
  var publicIndex = {
    slug: 'publicTypeIndex.ttl',
    data: `<> a <http://www.w3.org/ns/solid/terms#TypeIndex>,
            <http://www.w3.org/ns/solid/terms#ListedDocument> .`
  }
  var privateIndex = {
    slug: 'privateTypeIndex.ttl',
    data: `<> a <http://www.w3.org/ns/solid/terms#TypeIndex>,
            <http://www.w3.org/ns/solid/terms#UnlistedDocument> .`
  }

  return webClient.post(containerUrl, publicIndex.data, publicIndex.slug, options)
    .then(function (metaPublic) {
      var uri = util.absoluteUrl(containerUrl, metaPublic.url)
      var webid = rdf.sym(profile.webId)
      // patch profile
      var pubGraph = rdf.graph()
      pubGraph.add(webid, vocab.solid('publicTypeIndex'), rdf.sym(uri))
      var toAdd = []
      pubGraph.statementsMatching(webid, undefined, undefined)
        .forEach(function (st) {
          toAdd.push(st.toNT())
        })

      return webClient.patch(profile.webId, [], toAdd, options)
        .then(function (result) {
          profile.typeIndexListed.uri = uri
          if (!profile.preferences && profile.preferences.uri) {
            profile.typeIndexListed.graph = pubGraph
            profile.typeIndexListed.uri = uri
            return profile
          }
          // create privateIndex
          return webClient.post(containerUrl, privateIndex.data,
                                privateIndex.slug, options)
            .then(function (metaPrivate) {
              var uri = util.absoluteUrl(containerUrl, metaPrivate.url)
              profile.typeIndexUnlisted.uri = uri
              // patch profile
              var prvGraph = rdf.graph()
              prvGraph.add(webid, vocab.solid('privateTypeIndex'), rdf.sym(uri))
              var toAdd = []
              prvGraph.statementsMatching(webid, undefined, undefined)
                .forEach(function (st) {
                  toAdd.push(st.toNT())
                })

              return webClient.patch(profile.preferences.uri, [], toAdd, options)
                .then(function (result) {
                  profile.typeIndexUnlisted.graph = prvGraph
                  return profile
                })
                .catch(function (err) {
                  throw new Error('Could not update profile:' + err)
                })
            }).catch(function (err) {
              throw new Error('Could not create privateIndex document:' + err)
            })
        }).catch(function (err) {
          throw new Error('Could not update profile:' + err)
        })
    })
    .catch(function (err) {
      throw new Error('Could not create publicIndex document:' + err)
    })
}

/**
 * Adds an RDF class to a user's type index registry.
 * Called by `registerTypeIndex()`, which does all the argument validation.
 * @param profile {SolidProfile} User's WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI  to the location you want the class
 *   registered to.
 * @param locationType {String} Either 'instance' or 'container'
 * @param isListed {Boolean} Whether to register in a listed or unlisted index).
 * @return {<SolidProfile>}
 */
function addToTypeIndex (profile, rdfClass, location, locationType,
                         isListed) {
  // TODO: Check to see if a registry entry for this type already exists.
  // Generate a fragment identifier for the new registration
  var hash = require('shorthash')
  var fragmentId = hash.unique(rdfClass.uri)
  var registryUri
  var registryGraph
  if (isListed) {
    registryUri = profile.typeIndexListed.uri
    registryGraph = profile.typeIndexListed.graph
  } else {
    registryUri = profile.typeIndexUnlisted.uri
    registryGraph = profile.typeIndexUnlisted.graph
  }
  if (!registryUri) {
    throw new Error('Cannot register type, registry URL missing')
  }
  var registrationUri = rdf.sym(registryUri + '#' + fragmentId)
  // Set the class for the location type
  var locationTypeClass
  if (locationType === 'instance') {
    locationTypeClass = vocab.solid('instance')
  } else {
    locationTypeClass = vocab.solid('instanceContainer')
    // Add trailing slash if it's missing and is a container
    if (location.lastIndexOf('/') !== location.length - 1) {
      location += '/'
    }
  }
  // triples to delete
  var toDel = null
  // Create the list of triples to add in the PATCH operation
  var graph = rdf.graph()
  // e.g. <#ab09fd> a solid:TypeRegistration;
  graph.add(registrationUri, vocab.rdf('type'), vocab.solid('TypeRegistration'))
  // e.g. solid:forClass sioc:Post;
  graph.add(registrationUri, vocab.solid('forClass'), rdfClass)
  // e.g. solid:instanceContainer </posts/>.
  graph.add(registrationUri, locationTypeClass, rdf.sym(location))

  var toAdd = []
  graph.statementsMatching(registrationUri, undefined, undefined)
    .forEach(function (st) {
      toAdd.push(st.toNT())
    })

  return webClient.patch(registryUri, toDel, toAdd)
    .then(function () {
      // Update the profile object with the new registry without reloading
      if (!registryGraph) {
        registryGraph = graph
      }
      graphUtil.appendGraph(registryGraph, graph, registryUri)
      return profile
    })
}

/**
 * Returns true if the parsed graph is a `solid:UnlistedDocument` document.
 * @method isUnlistedTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isUnlistedTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('UnlistedDocument'), graph.uri)
}

/**
 * Returns true if the parsed graph is a `solid:ListedDocument` document.
 * @method isListedTypeIndex
 * @param graph {$rdf.IndexedFormula} Parsed graph (loaded from a type index
 *   resource)
 * @return {Boolean}
 */
function isListedTypeIndex (graph) {
  return graph.any(null, null, vocab.solid('ListedDocument'), graph.uri)
}

/**
 * Loads the public and private type registry index resources, adds them
 * to the profile, and returns the profile.
 * Called by the profile.loadTypeRegistry() alias method.
 * Usage:
 *
 *   ```
 * var profile = solid.getProfile(url, options)
 *   .then(function (profile) {
 *     return profile.loadTypeRegistry(options)
 *   })
 *   ```
 * @method loadTypeRegistry
 * @param profile {SolidProfile}
 * @param [options] Options hashmap (see solid.web.solidRequest() function docs)
 * @return {Promise<SolidProfile>}
 */
function loadTypeRegistry (profile, options) {
  options = options || {}
  options.headers = options.headers || {}
  // Politely ask for Turtle format
  if (!options.headers['Accept']) {
    options.headers['Accept'] = 'text/turtle'
  }
  // load public and private index resources
  var links = []
  if (profile.typeIndexListed.uri) {
    links.push(profile.typeIndexListed.uri)
  }
  if (profile.typeIndexUnlisted.uri) {
    links.push(profile.typeIndexUnlisted.uri)
  }
  return webClient.loadParsedGraphs(links, options)
    .then(function (loadedGraphs) {
      loadedGraphs.forEach(function (graph) {
        // For each index resource loaded, add it to `profile.typeIndexListed`
        //  or `profile.typeIndexUnlisted` as appropriate
        if (graph && graph.value) {
          profile.addTypeRegistry(graph.value, graph.uri)
        }
      })
      return profile
    })
}

/**
 * Registers a given RDF class in the user's type index registries, so that
 * other applications can discover it.
 * @method registerType
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param location {String} Absolute URI to the location you want the class
 *   registered to. (Example: Registering Address books in
 *   `https://example.com/contacts/`)
 * @param [locationType='container'] {String} Either 'instance' or 'container',
 *   defaults to 'container'
 * @param [isListed=false] {Boolean} Whether to register in a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @return {Promise<SolidProfile>}
 */
function registerType (profile, rdfClass, location, locationType, isListed) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass || !location) {
    throw new Error('Type registration requires type class and location')
  }
  locationType = locationType || 'container'
  if (locationType !== 'container' && locationType !== 'instance') {
    throw new Error('Invalid location type')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (isListed && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (!isListed && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return addToTypeIndex(profile, rdfClass, location, locationType,
        isListed)
    })
}

/**
 * Returns lists of registry entries for a profile and a given RDF Class.
 * @method typeRegistryForClass
 * @param profile {SolidProfile}
 * @param rdfClass {rdf.NamedNode} RDF Class
 * @return {Array<IndexRegistration>}
 */
function typeRegistryForClass (profile, rdfClass) {
  var registrations = []
  var isListed = true

  return registrations
    .concat(
      registrationsFromGraph(profile.typeIndexListed.graph, rdfClass, isListed)
    )
    .concat(
      registrationsFromGraph(profile.typeIndexUnlisted.graph, rdfClass,
        !isListed)
    )
}

/**
 * Returns a list of registry entries from a given parsed type index graph.
 * @method registrationsFromGraph
 * @param graph {rdf.IndexedFormula} Parsed type index graph
 * @param rdfClass {rdf.NamedNode} RDF Class
 * @param isListed {Boolean} Whether to register in a listed or unlisted index
 * @return {Array<IndexRegistration>}
 */
function registrationsFromGraph (graph, rdfClass, isListed) {
  var entrySubject
  var locations = []
  var registrations = []
  if (!graph) {
    return registrations
  }

  var matches = graph.statementsMatching(null, null, rdfClass)
  matches.forEach(function (match) {
    entrySubject = match.subject
    // Have the hash fragment of the registration, now need to determine
    // location type, and the actual location.
    locations = graph.statementsMatching(entrySubject,
                                        vocab.solid('instance'), undefined)
    if (locations.length > 0) {
      locations.forEach(function (location) {
        registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
          'instance', location.object.uri, isListed))
      })
    }
    // Now try to find solid:instanceContainer matches
    locations = graph.statementsMatching(entrySubject,
                                    vocab.solid('instanceContainer'), undefined)
    if (locations.length > 0) {
      locations.forEach(function (location) {
        registrations.push(new IndexRegistration(entrySubject.uri, rdfClass,
          'container', location.object.uri, isListed))
      })
    }
  })
  return registrations
}

/**
 * Returns a list of statements related to a given registry entry, to remove
 * them via PATCH, see `removeFromTypeIndex()`.
 * @param registryGraph {$rdf.IndexedFormula} Type index registry graph
 * @param registration {IndexRegistration} Type index registry entry to generate
 *   statements from.
 * @return {Array<String>} List of statements (in "canonical" string format)
 *   related to the registry.
 */
function registryTriplesFor (registryGraph, registration) {
  var statements = []
  // Return all statements related to the registry entry (that have it as
  // the subject)
  registryGraph.statementsMatching(rdf.sym(registration.registrationUri))
    .forEach(function (match) {
      statements.push(match.toNT())
    })
  return statements
}

/**
 * Removes an RDF class from a user's type index registry.
 * Called by `unregisterTypeIndex()`, which does all the argument validation.
 * @param profile {SolidProfile} User's WebID profile
 * @param rdfClass {rdf.NamedNode} Type to remove from the registry
 * @param isListed {Boolean} Whether to remove from a listed or unlisted index
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
function removeFromTypeIndex (profile, rdfClass, isListed, location) {
  var registryUri
  var registryGraph
  if (isListed) {
    registryUri = profile.typeIndexListed.uri
    registryGraph = profile.typeIndexListed.graph
  } else {
    registryUri = profile.typeIndexUnlisted.uri
    registryGraph = profile.typeIndexUnlisted.graph
  }
  if (!registryUri) {
    throw new Error('Cannot unregister type, registry URL missing')
  }
  // Get the existing registrations
  var registrations = registrationsFromGraph(registryGraph, rdfClass, isListed)
  if (registrations.length === 0) {
    // No existing registrations, no need to do anything, just return profile
    return new Promise(function (resolve, reject) {
      resolve(profile)
    })
  }
  if (location) {
    // If location is present, filter the to-remove list only to registrations
    // that are in that location.
    registrations = registrations.filter(function (registration) {
      return registration.locationUri === location
    })
  }
  // Generate triples to delete
  var toDel = []
  registrations.forEach(function (registration) {
    toDel = toDel.concat(registryTriplesFor(registryGraph, registration))
  })
  // Nothing to add
  var toAdd = []
  return webClient.patch(registryUri, toDel, toAdd)
    .then(function (result) {
      // Update the registry, to reflect new state
      return profile.loadTypeRegistry()
    })
}

/**
 * Removes a given RDF class from a user's type index registry, so that
 * other applications can discover it.
 * @method unregisterType
 * @param profile {SolidProfile} Loaded WebID profile
 * @param rdfClass {rdf.NamedNode} Type to register in the index.
 * @param [isListed=false] {Boolean} Whether to remove from a listed or unlisted
 *   index). Defaults to `false` (unlisted).
 * @param [location] {String} If present, only unregister the class from this
 *   location (absolute URI).
 * @return {Promise<SolidProfile>}
 */
function unregisterType (profile, rdfClass, isListed, location) {
  if (!profile) {
    throw new Error('No profile provided')
  }
  if (!profile.isLoaded) {
    throw new Error('Profile is not loaded')
  }
  if (!rdfClass) {
    throw new Error('Unregistering a type requires type class')
  }
  return loadTypeRegistry(profile)  // make sure type registry is loaded
    .then(function (profile) {
      if (isListed && !profile.typeIndexListed.graph) {
        throw new Error('Profile has no Listed type index')
      }
      if (!isListed && !profile.typeIndexUnlisted.graph) {
        throw new Error('Profile has no Unlisted type index')
      }
      return removeFromTypeIndex(profile, rdfClass, isListed, location)
    })
}

},{"./solid/index-registration":6,"./util/graph-util.js":12,"./util/rdf-parser":13,"./util/web-util.js":16,"./vocab":18,"./web":19,"shorthash":21}],12:[function(require,module,exports){
'use strict'
/**
 * Provides convenience methods for graph manipulation.
 * Currently depends on RDFLib
 * @module graph-util
 */
module.exports.appendGraph = appendGraph
module.exports.parseGraph = parseGraph
module.exports.parseLinks = parseLinks

var rdf = require('./rdf-parser').rdflib

/**
 * Appends RDF statements from one graph object to another
 * @method appendGraph
 * @param toGraph {Graph} rdf.Graph object to append to
 * @param fromGraph {Graph} rdf.Graph object to append from
 * @param docURI {String} Document URI to use as source
 */
function appendGraph (toGraph, fromGraph, docURI) {
  // var source = (docURI) ? rdf.sym(docURI) : undefined
  fromGraph.statementsMatching(null, null, null, null)
    .forEach(function (st) {
      toGraph.add(st.subject, st.predicate, st.object, st.why)
    })
}

/**
 * Parses a given graph, from text rdfSource, as a given content type.
 * Returns parsed graph.
 * @method parseGraph
 * @param baseUrl {String}
 * @param rdfSource {String} Text source code
 * @param contentType {String} Mime Type (determines which parser to use)
 * @return {rdf.Graph}
 */
function parseGraph (baseUrl, rdfSource, contentType) {
  var parsedGraph = rdf.graph()
  rdf.parse(rdfSource, parsedGraph, baseUrl, contentType)
  return parsedGraph
}

/**
 * Extracts the URIs from a parsed graph that match parameters.
 * The URIs are a set (duplicates are removed)
 * @method parseLinks
 * @param graph {rdf.IndexedFormula}
 * @param subject {rdf.Symbol}
 * @param predicate {rdf.Symbol}
 * @param object {rdf.Symbol}
 * @param source {rdf.Symbol}
 * @return {Array<String>} Array of link URIs that match the parameters
 */
function parseLinks (graph, subject, predicate, object, source) {
  var links = {}
  var matches = graph.statementsMatching(subject,
    predicate, object, source)
  matches.forEach(function (match) {
    links[match.object.uri] = true
  })
  return Object.keys(links)
}

},{"./rdf-parser":13}],13:[function(require,module,exports){
'use strict'
/**
 * Provides a generic wrapper around an RDF Parser library
 * (currently only RDFLib)
 *  @@ RDFLib is NOT JUST a parser library. It is a quadstore and a serializer library!
 * @module rdf-parser
 */
var RDFParser = {}
if (typeof $rdf !== 'undefined') {
  RDFParser.rdflib = $rdf // FF extension
} else if (typeof tabulator !== 'undefined') {
  RDFParser.rdflib = tabulator.rdf
} else if (typeof window !== 'undefined') {
  // Running inside the browser but NOT FF extension
  RDFParser.rdflib = window.$rdf
} else {
  // in Node.js
  RDFParser.rdflib = require('rdflib')
}
module.exports = RDFParser

},{"rdflib":undefined}],14:[function(require,module,exports){
'use strict'
/**
 * Provides a namespace wrapper for RDFLib's symbols
 * @module web-rdflib
 */
module.exports = rdflibNamespace

var rdf = require('./rdf-parser').rdflib
var ns = require('rdf-ns')

/**
 * Accepts a namespace URI and returns a curried wrapper for 'rdf-ns'.
 * Usage:
 *
 *  ```
 *  var ns = require('./util/rdflib-ns')
 *  var rdfs = ns('http://www.w3.org/2000/01/rdf-schema#')
 *
 *  var seeAlso = rdfs('seeAlso')
 *  console.log(seeAlso)
 *  // -> rdf.Symbol(<http://www.w3.org/2000/01/rdf-schema#seeAlso>)
 *  ```
 */
function rdflibNamespace (namespaceUri) {
  var namespace = ns(namespaceUri)
  // Wrap the namespace object to return an rdf.Symbol
  var wrapper = function wrapper (term) {
    return rdf.sym(namespace(term))
  }
  return wrapper
}

},{"./rdf-parser":13,"rdf-ns":20}],15:[function(require,module,exports){
'use strict'
/**
 * Provides a wrapper for rdflib's web operations (`rdf.Fetcher` based)
 * @module web-rdflib
 */
var rdf = require('./rdf-parser').rdflib

/**
 * @class rdflibWebClient
 * @static
 */
var rdflibWebClient = {
  /**
   * Retrieves a resource via HTTP, parses it, and returns the result.
   * @method getParsedGraph
   * @param url {String} URL of the resource or container to fetch
   * @param proxyUrl {String} URL template of the proxy to use for CORS
   *                          requests.
   * @param timeout {Number} Request timeout in milliseconds.
   * @param [suppressError=false] {Boolean} Resolve with a null graph on error
   *   if true, reject otherwise. Set to true when using `Promise.all()`
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout,
      suppressError) {
    rdf.Fetcher.crossSiteProxyTemplate = proxyUrl
    var promise = new Promise(function (resolve, reject) {
      var graph = rdf.graph()
      var fetcher = new rdf.Fetcher(graph, timeout)

      var docURI = (url.indexOf('#') >= 0)
        ? url.slice(0, url.indexOf('#'))
        : url
      fetcher.nowOrWhenFetched(docURI, undefined, function (ok, body, xhr) {
        if (!ok) {
          if (suppressError) {
            resolve(null)
          } else {
            reject({status: xhr.status, xhr: xhr})
          }
        } else {
          resolve(graph)
        }
      })
    }, function (error) {
      console.log('Error in getParsedGraph: %o', error)
    })

    return promise
  }
}

module.exports = rdflibWebClient

},{"./rdf-parser":13}],16:[function(require,module,exports){
'use strict'
/**
 * Provides misc utility functions for the web client
 * @module web-util
 */
module.exports.composePatchQuery = composePatchQuery
module.exports.parseAllowedMethods = parseAllowedMethods
module.exports.parseLinkHeader = parseLinkHeader
module.exports.absoluteUrl = absoluteUrl

/**
 * Extracts the allowed HTTP methods from the 'Allow' and 'Accept-Patch'
 * headers, and returns a hashmap of verbs allowed by the server
 * @method parseAllowedMethods
 * @param allowMethodsHeader {String} `Access-Control-Allow-Methods` response
 *   header
 * @param acceptPatchHeader {String} `Accept-Patch` response header
 * @return {Object} Hashmap of verbs (in lowercase) allowed by the server for
 *   the current user. Example:
 *   ```
 *   {
 *     'get': true,
 *     'put': true
 *   }
 *   ```
 */
function parseAllowedMethods (allowMethodsHeader, acceptPatchHeader) {
  var allowedMethods = {}
  if (allowMethodsHeader) {
    var verbs = allowMethodsHeader.split(',')
    verbs.forEach(function (methodName) {
      if (methodName && allowMethodsHeader.indexOf(methodName) >= 0) {
        allowedMethods[methodName.trim().toLowerCase()] = true
      }
    })
  }
  if (acceptPatchHeader &&
      acceptPatchHeader.indexOf('application/sparql-update') >= 0) {
    allowedMethods.patch = true
  }
  return allowedMethods
}

/**
* Parses a Link header from an XHR HTTP Request.
* @method parseLinkHeader
* @param link {String} Contents of the Link response header
* @return {Object}
*/
function parseLinkHeader (link) {
  if (!link) {
    return {}
  }
  var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g
  var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g
  var matches = link.match(linkexp)
  var rels = {}
  for (var i = 0; i < matches.length; i++) {
    var split = matches[i].split('>')
    var href = split[0].substring(1)
    var ps = split[1]
    var s = ps.match(paramexp)

    for (var j = 0; j < s.length; j++) {
      var p = s[j]
      var paramsplit = p.split('=')
      // var name = paramsplit[0]
      var rel = paramsplit[1].replace(/["']/g, '')
      if (!rels[rel]) {
        rels[rel] = []
      }
      rels[rel].push(href)
      if (rels[rel].length > 1) {
        rels[rel].sort()
      }
    }
  }
  return rels
}

/**
* Return an absolute URL
* @method absoluteUrl
* @param baseUrl {String} URL to be used as base
* @param pathUrl {String} Absolute or relative URL
* @return {String}
*/
function absoluteUrl (baseUrl, pathUrl) {
  if (pathUrl && pathUrl.slice(0, 4) !== 'http') {
    return [baseUrl, pathUrl].map(function (path) {
      if (path[0] === '/') {
        path = path.slice(1)
      }
      if (path[path.length - 1] === '/') {
        path = path.slice(0, path.length - 1)
      }
      return path
    }).join('/')
  }
  return pathUrl
}

/**
 * Composes and returns a PATCH SPARQL query (for use with `web.patch()`)
 * @method composePatchQuery
 * @param toDel {Array<String>} List of triples to delete
 * @param toIns {Array<String>} List of triples to insert
 * @return {String} SPARQL query for use with PATCH
 */
function composePatchQuery (toDel, toIns) {
  var query = ''

  if (toDel && toDel.length > 0) {
    toDel = toDel.map(function (each) {
      if (each.endsWith('.')) {
        each = each.slice(0, -1)
      }
      return each
    })
    query += 'DELETE DATA { ' + toDel.join(' . ') + ' };\n'
  }
  if (toIns && toIns.length > 0) {
    toIns = toIns.map(function (each) {
      if (each.endsWith('.')) {
        each = each.slice(0, -1)
      }
      return each
    })
    query += 'INSERT DATA { ' + toIns.join(' . ') + ' };\n'
  }
  return query
}

},{}],17:[function(require,module,exports){
'use strict'
/* global Components */
/**
 * Provides a generic wrapper around the XMLHttpRequest object, to make it
 * usable both in the browser and firefox extension and in Node.js
 * @module xhr
 */
var XMLHttpRequest
if (typeof tabulator !== 'undefined' && tabulator.isExtension) {
  // Running inside the Tabulator Firefox extension
  // Cannot use XMLHttpRequest natively, must request it through SDK
  XMLHttpRequest = Components
    .classes['@mozilla.org/xmlextras/xmlhttprequest;1']
    .createInstance()
    .QueryInterface(Components.interfaces.nsIXMLHttpRequest)
} else if (typeof window !== 'undefined' && 'XMLHttpRequest' in window) {
  // Running inside the browser
  XMLHttpRequest = window.XMLHttpRequest
} else {
  // in Node.js
  XMLHttpRequest = require('xhr2')
}
module.exports = XMLHttpRequest

},{"xhr2":undefined}],18:[function(require,module,exports){
'use strict'
/**
 * Provides a hashmap of relevant vocabs / namespaces.
 * Usage:
 *
 *   ```
 *   var solid = require('solid')
 *   var vocab = solid.vocab
 *   console.log(vocab.foaf('name'))  // -> <http://xmlns.com/foaf/0.1/name>
 *   ```
 * @module vocab
 */

var ns = require('./util/rdflib-ns')

var vocab = {
  'dct': ns('http://purl.org/dc/terms/'),
  'foaf': ns('http://xmlns.com/foaf/0.1/'),
  'ldp': ns('http://www.w3.org/ns/ldp#'),
  'owl': ns('http://www.w3.org/2002/07/owl#'),
  'pim': ns('http://www.w3.org/ns/pim/space#'),
  'rdf': ns('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  'rdfs': ns('http://www.w3.org/2000/01/rdf-schema#'),
  'sioc': ns('http://rdfs.org/sioc/ns#'),
  'solid': ns('http://www.w3.org/ns/solid/terms#'),
  'vcard': ns('http://www.w3.org/2006/vcard/ns#'),
  'xsd': ns('http://www.w3.org/2001/XMLSchema#')
}

module.exports = vocab

},{"./util/rdflib-ns":14}],19:[function(require,module,exports){
'use strict'
/**
 * Provides a Solid web client class for performing LDP CRUD operations.
 * @module web
 */
var config = require('../config')
var graphUtil = require('./util/graph-util')
var SolidResponse = require('./solid/response')
var SolidContainer = require('./solid/container')
var vocab = require('./vocab')
var XMLHttpRequest = require('./util/xhr')
var HttpError = require('standard-http-error')

/**
 * Provides a collection of Solid/LDP web operations (CRUD)
 * @class SolidWebClient
 * @static
 */
var SolidWebClient = {
  /**
   * Creates a Solid container with the specified name.
   * Uses PUT instead of POST to guarantee the container name (and uses
   * conditional HTTP headers to fail with a `409 Conflict` error if
   * a container with that name already exists).
   * @method createContainer
   * @param parentUrl {String} Parent directory/container in which to create
   * @param name {String} Container name (slug / URL fragment), no trailing
   *   slash needed.
   * @param [options] Options hashmap (optional, see `solidRequest()`)
   * @param [data] {String} Optional RDF data payload (additional triples
   *   that will be added to the container's metadata)
   * @throw {HttpError} Throws an error if a resource or container with the
   *   same name already exists
   * @return {Promise<SolidResponse>}
   */
  createContainer: function createContainer (parentUrl, name, options, data) {
    return this.post(parentUrl, data, name, true)
    // var newContainerUrl = parentUrl + name
    // options = options || {}
    // options.headers = options.headers || {}
    // options.headers['If-None-Match'] = '*'
    // var resourceType = vocab.ldp('BasicContainer')
    // options.headers['Link'] = resourceType + '; rel="type"'
    // var mimeType = 'text/turtle'
    // return this.put(newContainerUrl, data, mimeType, options)
    //  .catch(function (error) {
    //    if (error instanceof HttpError) {
    //      if (error.code === HttpError.CONFLICT) {
    //        error.message = 'A resource with the same name already exists'
    //      } else if (error.code === HttpError.PRECONDITION_FAILED) {
    //        error.message = 'A container with the same name already exists'
    //      }
    //      throw error
    //    }
    //  })
  },

  /**
   * Creates and returns the appropriate Solid wrapper for the XHR response.
   * @method createResponse
   * @param xhrResponse {XMLHttpRequest} XHR Response
   * @param method {String} HTTP verb
   * @return {SolidResponse|SolidContainer} Either a SolidResponse or a
   *   SolidContainer instance.
   */
  createResponse: function createResponse (xhrResponse, method) {
    var response = new SolidResponse(xhrResponse, method)
    if (response.method === 'get' && response.isContainer()) {
      return new SolidContainer(response.location, response)
    }
    return response
  },

  /**
   * Returns the current window's location (for use with `needsProxy()`)
   * if used in browser, or `null` if used from Node.
   * @method currentUrl
   * @return {String|Null}
   */
  currentUrl: function currentUrl () {
    if (typeof window !== 'undefined') {
      return window.location.href
    } else {
      return null
    }
  },

  /**
   * Determines whether the web client needs to fall back onto a Proxy url,
   * to avoid being blocked by CORS
   * @method needsProxy
   * @param url {String}
   * @return {Boolean}
   */
  needsProxy: function needsProxy (url) {
    var currentUrl = this.currentUrl()
    var currentIsHttps = currentUrl && currentUrl.slice(0, 6) === 'https:'
    var targetIsHttp = url && url.slice(0, 5) === 'http:'
    return currentIsHttps && targetIsHttp
  },

  /**
   * Turns a given URL into a proxied version, using a proxy template
   * @method proxyUrl
   * @param url {String} Intended URL
   * @param proxyUrlTemplate {String}
   * @return {String}
   */
  proxyUrl: function proxyUrl (url, proxyUrlTemplate) {
    proxyUrlTemplate = proxyUrlTemplate || config.proxyUrl
    return proxyUrlTemplate.replace('{uri}', encodeURIComponent(url))
  },

  /**
   * Sends a generic XHR request with the appropriate Solid headers,
   * and returns a promise that resolves to a parsed response.
   * @method solidRequest
   * @param url {String} URL of the request
   * @param method {String} HTTP Verb ('GET', 'PUT', etc)
   * @param [options] Options hashmap
   * @param [options.noCredentials=false] {Boolean} Don't use `withCredentials`
   * @param [options.forceProxy=false] {Boolean} Enforce using proxy URL if true
   * @param [options.headers={}] {Object} HTTP headers to send along
   *          with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @param [data] {Object} Optional data / payload
   * @throws {HttpError} Rejects with `httpError.HttpError` of the appropriate
   *   type
   * @return {Promise<SolidResponse>}
   */
  solidRequest: function solidRequest (url, method, options, data) {
    options = options || {}
    options.headers = options.headers || {}
    options.proxyUrl = options.proxyUrl || config.proxyUrl
    options.timeout = options.timeout || config.timeout
    if (this.needsProxy(url) || options.forceProxy) {
      url = this.proxyUrl(url)
    }
    var webClient = this
    return new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest()
      http.open(method, url)
      if (!options.noCredentials) {
        http.withCredentials = true
      }
      for (var header in options.headers) {  // Add in optional headers
        http.setRequestHeader(header, options.headers[header])
      }
      if (options.timeout) {
        http.timeout = options.timeout
      }
      http.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(webClient.createResponse(this, method))
        } else {
          reject(new HttpError(this.status, this.statusText, {xhr: this}))
        }
      }
      http.onerror = function () {
        reject(new HttpError(this.status, this.statusText, {xhr: this}))
      }
      if (typeof data === 'undefined' || !data) {
        http.send()
      } else {
        http.send(data)
      }
    })
  },

  /**
   * Checks to see if a Solid resource exists, and returns useful resource
   *   metadata info.
   * @method head
   * @param url {String} URL of a resource or container
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  head: function head (url) {
    return this.solidRequest(url, 'HEAD')
  },

  /**
   * Retrieves a resource or container by making an HTTP GET call.
   * @method get
   * @param url {String} URL of the resource or container to fetch
   * @param [options] Options hashmap
   * @param [options.headers] {Object} HTTP headers to send along with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise<SolidResponse|SolidContainer>|Object} Result of the HTTP
   *   GET operation, or an error object
   */
  get: function get (url, options) {
    options = options || {}
    options.headers = options.headers || {}
    // If no explicit Accept: header specified, set one
    if (!options.headers['Accept']) {
      options.headers['Accept'] =
        'text/turtle;q=0.8,*/*;q=0.5'
    }
    return this.solidRequest(url, 'GET', options)
  },

  /**
   * Lists the contents of a Solid Container.
   * (Deprecated, use `web.get()` instead.)
   * @method list
   * @deprecated
   * @param url {String} Url of the container to list
   * @param [options] Options hashmap, see docs for `solidResponse()`
   * @return {Promise<SolidContainer>}
   */
  list: function list (url, options) {
    console.warn('web.list() is deprecated. Use web.get() instead.')
    if (typeof url !== 'string') {
      throw new Error('Invalid url passed to list()')
    }
    // Make sure the container url ends in a /
    var urlNotEmpty = url !== ''
    var noEndingSlash = !url.endsWith('/')
    if (urlNotEmpty && noEndingSlash) {
      url = url + '/'
    }
    options = options || {}
    options.headers = options.headers || {}
    if (!options.headers['Accept']) {
      options.headers['Accept'] = 'text/turtle'
    }
    return this.get(url, options)
      .then(function (result) {
        return new SolidContainer(url, result)
      })
  },

  /**
   * Loads a list of given RDF graphs via an async `Promise.all()`,
   * which resolves to an array of uri/parsed-graph hashes.
   * @method loadParsedGraphs
   * @param locations {Array<String>} Array of graph URLs to load
   * @param [options] Options hashmap
   * @param [options.forceProxy=false] {Boolean} Enforce using proxy URL if true
   * @param [options.headers={}] {Object} HTTP headers to send along
   *          with request
   * @param [options.proxyUrl=config.proxyUrl] {String} Proxy URL to use for
   *          CORS Requests.
   * @param [options.timeout=config.timeout] {Number} Request timeout in
   *          milliseconds.
   * @return {Promise<Array<Object>>}
   */
  loadParsedGraphs: function loadParsedGraphs (locations, options) {
    var web = this
    var loadPromises = locations.map(function (location) {
      return web.get(location, options)
        .then(function (response) {
          var contentType = response.contentType()
          return graphUtil.parseGraph(location, response.raw(), contentType)
        })
        .catch(function (err) {
          console.log(err)
          // Suppress the error, no need to reject, just return null graph
          return null
        })
        .then(function (parsedGraph) {
          return {
            uri: location,
            value: parsedGraph
          }
        })
    })
    return Promise.all(loadPromises)
  },

  /**
   * Issues an HTTP OPTIONS request. Useful for discovering server capabilities
   * (`Accept-Patch:`, `Updates-Via:` for websockets, etc).
   * @method head
   * @param url {String} URL of a resource or container
   * @return {Promise} Result of an HTTP HEAD operation (returns a meta object)
   */
  options: function options (url) {
    return this.solidRequest(url, 'OPTIONS')
  },

  /**
   * Retrieves a resource via HTTP, parses it using the default parser
   * specified in `config.parser`, and returns the result.
   * @method getParsedGraph
   * @param url {String} URL of the resource or container to fetch
   * @param proxyUrl {String} URL template of the proxy to use for CORS
   *                          requests. Defaults to `config.proxyUrl`.
   * @param timeout {Number} Request timeout in milliseconds.
   *                         Defaults to `config.timeout`.
   * @param [suppressError=false] {Boolean} Resolve with a null graph on error
   *   if true, reject otherwise. Set to true when using `Promise.all()`
   * @return {Promise<Object>|Object}
   */
  getParsedGraph: function getParsedGraph (url, proxyUrl, timeout,
      suppressError) {
    proxyUrl = proxyUrl || config.proxyUrl
    timeout = timeout || config.timeout
    if (config.parser === 'rdflib') {
      var getParsedGraph = require('./util/web-rdflib').getParsedGraph
    } else {
      throw Error('Parser library not supported: ' + config.parser)
    }
    return getParsedGraph(url, proxyUrl, timeout, suppressError)
  },

  /**
   * Creates a new resource by performing
   *   a Solid/LDP POST operation to a specified container.
   * @param url {String} URL of the container to post to
   * @param data {Object} Data/payload of the resource to be created
   * @param slug {String} Suggested URL fragment for the new resource
   * @param isContainer {Boolean} Is the object being created a Container
   *            or Resource?
   * @param mimeType {String} Content Type of the data/payload
   * @method post
   * @return {Promise|Object} Result of XHR POST (returns parsed
   *     response meta object) or an anonymous error object with status code
   */
  post: function post (url, data, slug, isContainer, mimeType) {
    var resourceType
    if (isContainer) {
      resourceType = vocab.ldp('BasicContainer')
      mimeType = 'text/turtle' // Force the right mime type for containers only
    } else {
      resourceType = vocab.ldp('Resource')
      mimeType = mimeType || 'text/turtle'  // default to Turtle
    }
    var options = {}
    options.headers = {}
    options.headers['Link'] = resourceType + '; rel="type"'
    options.headers['Content-Type'] = mimeType
    if (slug && slug.length > 0) {
      options.headers['Slug'] = slug
    }
    return this.solidRequest(url, 'POST', options, data)
  },

  /**
   * Updates an existing resource or creates a new resource by performing
   *   a Solid/LDP PUT operation to a specified container
   * @method put
   * @param url {String} URL of the resource to be updated/created
   * @param data {Object} Data/payload of the resource to be created or updated
   * @param mimeType {String} MIME Type of the resource to be created
   * @param [options] Options hashmap, see docs for `solidResponse()`
   * @return {Promise|Object} Result of PUT operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  put: function put (url, data, mimeType, options) {
    options = options || {}
    options.headers = options.headers || {}
    // options.headers['Link'] = '<' + resourceType + '>; rel="type"'
    options.headers['Content-Type'] = mimeType
    return this.solidRequest(url, 'PUT', options, data)
  },

  /**
   * Partially edits an RDF-type resource by performing a PATCH operation.
   *   Accepts arrays of individual statements (in Turtle format) as params.
   *   For example:
   *   [ '<a> <b> <c> .', '<d> <e> <f> .']
   * @method patch
   * @param url {String} URL of the resource to be edited
   * @param toDel {Array<String>} Triples to remove from the resource
   * @param toIns {Array<String>} Triples to insert into the resource
   * @param [options] Options hashmap
   * @return {Promise|Object} Result of PATCH operation (returns parsed response
   *     meta object if successful, rejects with an anonymous error status
   *     object if not successful)
   */
  patch: function patch (url, toDel, toIns, options) {
    var composePatchQuery = require('./util/web-util').composePatchQuery
    var data = composePatchQuery(toDel, toIns)
    var mimeType = 'application/sparql-update'
    options = options || {}
    options.headers = options.headers || {}
    // options.headers['Link'] = '<' + resourceType + '>; rel="type"'
    options.headers['Content-Type'] = mimeType
    return this.solidRequest(url, 'PATCH', options, data)
  },

  /**
   * Deletes an existing resource or container.
   * @method del
   * @param url {String} URL of the resource or container to be deleted
   * @return {Promise|Object} Result of the HTTP Delete operation (returns true
   *   on success, or an anonymous error object on failure)
   */
  del: function del (url) {
    return this.solidRequest(url, 'DELETE')
  }
}

// Alias some extra Solid web client methods
SolidWebClient.create = SolidWebClient.post
SolidWebClient.replace = SolidWebClient.put
SolidWebClient.update = SolidWebClient.patch
module.exports = SolidWebClient

},{"../config":1,"./solid/container":5,"./solid/response":9,"./util/graph-util":12,"./util/web-rdflib":15,"./util/web-util":16,"./util/xhr":17,"./vocab":18,"standard-http-error":25}],20:[function(require,module,exports){
'use strict'

module.exports = rdfNamespace

function rdfNamespace (namespaceUri) {
  return function (term) {
    return namespaceUri + term
  }
}

},{}],21:[function(require,module,exports){
module.exports = require('./shorthash');
},{"./shorthash":22}],22:[function(require,module,exports){

/*
	shorthash
	(c) 2013 Bibig
	
	https://github.com/bibig/node-shorthash
	shorthash may be freely distributed under the MIT license.
*/

exports.bitwise = bitwise;
exports.binaryTransfer = binaryTransfer;
exports.unique = unique;
exports.random = random;

// refer to: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
function bitwise(str){
	var hash = 0;
	if (str.length == 0) return hash;
	for (var i = 0; i < str.length; i++) {
		var ch = str.charCodeAt(i);
		hash = ((hash<<5)-hash) + ch;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

// 10进制转化成62进制以内的进制
// convert 10 binary to customized binary, max is 62
function binaryTransfer(integer, binary) {
	binary = binary || 62;
	var stack = [];
	var num;
	var result = '';
	var sign = integer < 0 ? '-' : '';
	
	function table (num) {
		var t = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		return t[num];
	}
	
	integer = Math.abs(integer);
	
	while (integer >= binary) {
		num = integer % binary;
		integer = Math.floor(integer / binary);
		stack.push(table(num));
	}
	
	if (integer > 0) {
		stack.push(table(integer));
	}
	
	for (var i = stack.length - 1; i >= 0; i--) {
		result += stack[i];
	} 
	
	return sign + result;
}


/**
 * why choose 61 binary, because we need the last element char to replace the minus sign
 * eg: -aGtzd will be ZaGtzd
 */
function unique (text) {
	var id = binaryTransfer(bitwise(text), 61);
	return id.replace('-', 'Z');
}

function random (_len) {
	/*
	var len = _len || 8 ;
	return require('crypto').randomBytes(len).toString('hex');
	*/
	
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var rs = '';
	var len = _len || 8 ;
	for (var i=0; i< len; i++) {
		var pos = Math.floor( Math.random() * chars.length);
		rs += chars.substring(pos, pos + 1);
	}
	return rs;
}
},{}],23:[function(require,module,exports){
var has = Object.hasOwnProperty
var proto = Object.getPrototypeOf
var trace = Error.captureStackTrace
module.exports = StandardError

function StandardError(msg, props) {
  // Let all properties be enumerable for easier serialization.
  if (msg && typeof msg == "object") props = msg, msg = undefined
  else this.message = msg

  // Name has to be an own property (or on the prototype a single step up) for
  // the stack to be printed with the correct name.
  if (props) for (var key in props) this[key] = props[key]
  if (!has.call(this, "name"))
    this.name = has.call(proto(this), "name")? this.name : this.constructor.name

  if (trace && !("stack" in this)) trace(this, this.constructor)
}

StandardError.prototype = Object.create(Error.prototype, {
  constructor: {value: StandardError, configurable: true, writable: true}
})

// Set name explicitly for when the code gets minified.
StandardError.prototype.name = "StandardError"

},{}],24:[function(require,module,exports){
module.exports={
	"100": "Continue",
	"101": "Switching Protocols",
	"102": "Processing",
	"200": "OK",
	"201": "Created",
	"202": "Accepted",
	"203": "Non-Authoritative Information",
	"204": "No Content",
	"205": "Reset Content",
	"206": "Partial Content",
	"207": "Multi-Status",
	"208": "Already Reported",
	"226": "IM Used",
	"300": "Multiple Choices",
	"301": "Moved Permanently",
	"302": "Found",
	"303": "See Other",
	"304": "Not Modified",
	"305": "Use Proxy",
	"307": "Temporary Redirect",
	"308": "Permanent Redirect",
	"400": "Bad Request",
	"401": "Unauthorized",
	"402": "Payment Required",
	"403": "Forbidden",
	"404": "Not Found",
	"405": "Method Not Allowed",
	"406": "Not Acceptable",
	"407": "Proxy Authentication Required",
	"408": "Request Timeout",
	"409": "Conflict",
	"410": "Gone",
	"411": "Length Required",
	"412": "Precondition Failed",
	"413": "Payload Too Large",
	"414": "URI Too Long",
	"415": "Unsupported Media Type",
	"416": "Range Not Satisfiable",
	"417": "Expectation Failed",
	"418": "I'm a teapot",
	"421": "Misdirected Request",
	"422": "Unprocessable Entity",
	"423": "Locked",
	"424": "Failed Dependency",
	"425": "Unordered Collection",
	"426": "Upgrade Required",
	"428": "Precondition Required",
	"429": "Too Many Requests",
	"431": "Request Header Fields Too Large",
	"500": "Internal Server Error",
	"501": "Not Implemented",
	"502": "Bad Gateway",
	"503": "Service Unavailable",
	"504": "Gateway Timeout",
	"505": "HTTP Version Not Supported",
	"506": "Variant Also Negotiates",
	"507": "Insufficient Storage",
	"508": "Loop Detected",
	"509": "Bandwidth Limit Exceeded",
	"510": "Not Extended",
	"511": "Network Authentication Required"
}

},{}],25:[function(require,module,exports){
exports = module.exports = HttpError
var StandardError = require("standard-error")
var STATUS_CODE_TO_NAME = require("./codes")
var STATUS_NAME_TO_CODE = exports

function HttpError(code, msg, props) {
  if (typeof code == "string") code = STATUS_NAME_TO_CODE[code]
  if (typeof code != "number") throw new TypeError("Non-numeric HTTP code")
  if (typeof msg == "object" && msg != null) props = msg, msg = null
  StandardError.call(this, msg || STATUS_CODE_TO_NAME[code], props)
  this.code = code
}

HttpError.prototype = Object.create(StandardError.prototype, {
  constructor: {value: HttpError, configurable: true, writable: true}
})

// Set name explicitly for when the code gets minified.
HttpError.prototype.name = "HttpError"

Object.defineProperties(HttpError.prototype, {
  statusCode: alias("code"),
  statusMessage: alias("message"),

  status: {
    configurable: true,
    get: function() { return this.code },
    set: function(value) {
      Object.defineProperty(this, "status", {
        value: value, configurable: true, enumerable: true, writable: true
      })
    }
  }
})

HttpError.prototype.toString = function() {
  return this.name + ": " + this.code + " " + this.message
}

for (var code in STATUS_CODE_TO_NAME) {
  var name = STATUS_CODE_TO_NAME[code]
  exports[name.replace("'", "").replace(/[- ]/g, "_").toUpperCase()] = +code
}

function alias(name) {
  return {
    configurable: true,
    get: function() { return this[name] },
    set: function(value) { return this[name] = value },
  }
}

},{"./codes":24,"standard-error":23}],26:[function(require,module,exports){
module.exports={
  "name": "solid-client",
  "version": "0.15.0",
  "description": "Common library for writing Solid read-write-web applications",
  "main": "./index.js",
  "scripts": {
    "build-browserified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' > dist/solid.js",
    "build-minified": "browserify -r ./index.js:solid --exclude 'xhr2' --exclude 'rdflib' -d -p [minifyify --no-map] > dist/solid.min.js",
    "build": "npm run clean && mkdir -p dist/resources && npm run standard && npm run build-browserified && npm run build-minified",
    "build-qunit-resources": "browserify -r ./test/resources/profile-ldnode.js:test-ldnode-profile --exclude 'xhr2' --exclude 'rdflib' > dist/resources/test-ldnode-profile.js",
    "clean": "rm -rf dist/",
    "standard": "standard lib/*",
    "tape": "tape test/unit/*.js",
    "test": "npm run standard && npm run tape",
    "qunit": "npm run standard && npm run build-browserified && open test/integration/index.html"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/solid/solid.js"
  },
  "keywords": [
    "solid",
    "decentralized",
    "web",
    "rdf",
    "ldp",
    "linked",
    "data"
  ],
  "author": "Andrei Sambra <andrei@fcns.eu>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/solid/solid.js/issues"
  },
  "homepage": "https://github.com/solid/solid.js",
  "dependencies": {
    "rdf-ns": "0.0.2",
    "rdflib": "^0.6.1",
    "shorthash": "0.0.2",
    "standard-http-error": "^2.0.0",
    "xhr2": "^0.1.3"
  },
  "devDependencies": {
    "browserify": "^13.0.0",
    "minifyify": "^7.2.1",
    "qunit": "^0.9.0",
    "standard": "^5.4.1",
    "tape": "^4.4.0"
  },
  "standard": {
    "globals": [
      "$rdf",
      "tabulator",
      "QUnit"
    ]
  }
}

},{}],"solid":[function(require,module,exports){
/*
The MIT License (MIT)

Copyright (c) 2015-2016 Solid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Solid.js is a Javascript library for Solid applications. This library currently
depends on rdflib.js. Please make sure to load the rdflib.js script before
loading solid.js.

If you would like to know more about the solid Solid project, please see
https://github.com/solid/solid
*/
'use strict'
/**
 * Provides a Solid client helper object (which exposes various static modules).
 * @module solid.js
 * @main solid.js
 */

/**
 * @class Solid
 * @static
 */
var Solid = {
  auth: require('./lib/auth'),
  config: require('./config'),
  currentUser: require('./lib/auth').currentUser,
  getProfile: require('./lib/identity').getProfile,
  identity: require('./lib/identity'),
  login: require('./lib/auth').login,
  meta: require('./lib/meta'),
  signup: require('./lib/auth').signup,
  status: require('./lib/status'),
  util: require('./lib/util/web-util'),
  vocab: require('./lib/vocab'),
  web: require('./lib/web')
}

module.exports = Solid

},{"./config":1,"./lib/auth":2,"./lib/identity":3,"./lib/meta":4,"./lib/status":10,"./lib/util/web-util":16,"./lib/vocab":18,"./lib/web":19}]},{},[]);
