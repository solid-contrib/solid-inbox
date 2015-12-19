var Inbox = Inbox || {};

Inbox = (function () {
    'use strict';

    var config = Inbox.config || {};
    var appURL = window.location.origin+window.location.pathname;

    // RDF
    var PROXY = "https://databox.me/,proxy?uri={uri}";
    var TIMEOUT = 5000;

    $rdf.Fetcher.crossSiteProxyTemplate = PROXY;
    // common vocabs
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
    var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
    var SOLID = $rdf.Namespace("http://www.w3.org/ns/solid/terms#");

    var user = {};

    var msgs = {};

    var authors = {};

    var webSockets = {};

    // Initialize app
    var init = function() {
        config.parentElement = '.timeline';

        // Init growl-like notifications
        window.addEventListener('load', function () {
            Notification.requestPermission(function (status) {
                // This allows to use Notification.permission with Chrome/Safari
                if (Notification.permission !== status) {
                    Notification.permission = status;
                }
            });
        });

        // try to load config from localStorage
        loadLocalStorage();
        loadLocalAuthors();


        if (len(user) === 0 || !user.authenticated) {
            showLogin();
        }
    };

    var showError = function(err) {
        console.log(err);
    };

    // Load messages from an inbox container
    var loadInbox = function(url, showGrowl) {
        // select elements holding all the messages
        var unread = document.getElementById('unread').querySelector('ul');
        var read = document.getElementById('read').querySelector('ul');

        // find known resources
        Solid.web.get(url).then(
            function(g) {
                var _messages = [];
                var st = g.statementsMatching(undefined, RDF('type'), SIOC('msg'));
                // fallback to containment triples
                if (st.length === 0) {
                    st = g.statementsMatching($rdf.sym(url), LDP('contains'), undefined);
                    st.forEach(function(s) {
                        _messages.push(s.object.uri);
                    })
                } else {
                    st.forEach(function(s) {
                        _messages.push(s.subject.uri);
                    });
                }

                if (_messages.length === 0) {
                    resetAll();
                    hideLoading();
                    if (user.authenticated) {
                        document.querySelector('.start').classList.remove('hidden');
                    } else {
                        document.querySelector('.init').classList.remove('hidden');
                    }
                }

                var toLoad = _messages.length;
                var isDone = function() {
                    if (toLoad <= 0) {
                        hideLoading();
                    }
                }

                // check if the object exists
                var exists = function(url, arr) {
                    for (var i=0; i<arr; i++) {
                        if (arr[i].url == url) {
                            return true;
                        }
                    }
                    return false;
                }

                var sortedRead = [];
                var sortedUnead = [];
                _messages.forEach(function(url){
                    loadMessage(url).then(
                        function(msg) {
                            if (len(msg) === 0) {
                                toLoad--;
                                isDone();
                            } else {
                                if (msg.read) {
                                    var sortedMsgs = sortedRead;
                                    var list = read;
                                } else {
                                    var sortedMsgs = sortedUnead;
                                    var list = unread;
                                }
                                list.classList.remove('hidden');
                                // convert msg to HTML
                                var article = msgToHTML(msg, true);

                                // sort array and add to dom
                                // TODO improve it later
                                sortedMsgs.push({date: msg.created, url: msg.url});
                                sortedMsgs.sort(function(a,b) {
                                    var c = new Date(a.date);
                                    var d = new Date(b.date);
                                    return d-c;
                                });
                                for(var i=0; i<sortedMsgs.length; i++) {
                                    var p = sortedMsgs[i];
                                    if (p.url == msg.url) {
                                        if (!msgs[url]) {
                                            if (i === sortedMsgs.length-1) {
                                                list.appendChild(article);
                                            } else {
                                                if (document.getElementById(sortedMsgs[i+1])) {
                                                    list.insertBefore(article, document.getElementById(sortedMsgs[i+1].url));
                                                }
                                            }
                                            if (showGrowl) {
                                                growl("New message", msg.title);
                                            }
                                        } else {
                                            updateMessage(msg);
                                        }
                                        break;
                                    }
                                }

                                // add msg to local list
                                msgs[msg.url] = msg;
                                toLoad--;
                                isDone();
                            }
                        }
                    )
                    .catch(
                        function(err) {
                            showError(err);
                            toLoad--;
                            isDone();
                        }
                    );
                });

                // setup WebSocket listener since we are sure we have msgs in this container
                Solid.web.head(url).then(function(meta) {
                    if (meta.websocket.length > 0) {
                        socketSubscribe(meta.websocket, url);
                    }
                }).catch(
                    function(err) {
                        showError(err);
                    }
                );
            }
        )
        .catch(
            function(err) {
                showError(err);
            }
        );
    };

    // Get one message
    var loadMessage = function(url) {
        var promise = new Promise(function(resolve, reject){
            Solid.web.get(url).then(
                function(g) {
                    var subject = g.any(undefined, RDF('type'), SIOC('Post'));
                    if (!subject) {
                        subject = g.any(undefined, RDF('type'), SOLID('Notification'));
                    }

                    if (subject) {
                        var msg = { url: subject.uri };

                        // add title
                        var title = g.any(subject, DCT('title'));
                        if (title && title.value) {
                            msg.title = encodeHTML(title.value);
                        }

                        // add author
                        var author = {};
                        var creator = g.any(subject, SIOC('has_creator'));
                        if (creator) {
                            var accountOf = g.any(creator, SIOC('account_of'));
                            if (accountOf) {
                                msg.author = encodeHTML(accountOf.uri);
                                author.webid = msg.author;
                            }
                            var name = g.any(creator, FOAF('name'));
                            if (name && name.value && name.value.length > 0) {
                                author.name = encodeHTML(name.value);
                            }
                            var picture = g.any(creator, SIOC('avatar'));
                            if (picture) {
                                author.picture = encodeHTML(picture.uri);
                            }
                        } else {
                            creator = g.any(subject, DCT('creator'));
                            if (creator) {
                                msg.author = encodeHTML(creator.uri);
                            }
                        }
                        // add to list of authors if not self
                        if (msg.author && msg.author != user.webid && !authors[msg.author]) {
                            authors[msg.author] = author;
                            // save list to localStorage
                            saveLocalAuthors();
                        }
                        // update author info with fresh data
                        if (msg.author && msg.author.length >0) {
                            updateAuthorInfo(msg.author, url);
                        }

                        // add created date
                        var created = g.any(subject, DCT('created'));
                        if (created) {
                            msg.created = created.value;
                        }

                        // add modified date
                        var modified = g.any(subject, DCT('modified'));
                        if (modified) {
                            msg.modified = modified.value;
                        } else {
                            msg.modified = msg.created;
                        }

                        // add body
                        var body = g.any(subject, SIOC('content'));
                        if (body) {
                            msg.body = body.value;
                        }

                        // add status (read/unread)
                        msg.read = false;
                        var read = g.any(subject, SIOC('viewed_by'));
                        if (read && read.uri == user.webid) {
                            msg.read = true;
                        }

                        // add statements
                        msg.statements = g.statementsMatching(undefined, undefined, undefined, $rdf.sym(url));
                        // return
                        resolve(msg);
                    } else {
                        resolve({});
                    }
                }
            )
            .catch(
                function(err) {
                    reject(err);
                }
            );
        });

        return promise;
    };

    // update author details with more recent data
    // TODO add date of last update to avoid repeated fetches
    var updateAuthorInfo = function(webid, url) {
        // check if it really needs updating first
        if (webid == user.webid || authors[webid].updated || authors[webid].lock) {
            return;
        }
        authors[webid].lock = true;
        Solid.identity.getProfile(webid).
        then(function(g) {
            var profile = getUserProfile(webid, g);
            if (len(profile) > 0) {
                authors[webid].updated = true;
                authors[webid].name = profile.name;
                authors[webid].picture = profile.picture;
                // save to localStorage
                saveLocalAuthors();
                // release lock
                authors[webid].lock = false;
                if (url && msgs[url]) {
                    var msgId = document.getElementById(url);
                    if (profile.name && msgId) {
                        msgId.querySelector('.msg-author').innerHTML = profile.name;
                        msgId.querySelector('.msg-picture').title = profile.name+"'s picture";
                        msgId.querySelector('.msg-picture').alt = profile.name+"'s picture";
                    }
                    if (profile.picture && msgId) {
                        msgId.querySelector('.msg-picture').src = profile.picture;
                    }
                }
            }
        }).
        catch(function(err) {
            console.log(err);
        });
    };

    var getAuthorByWebID = function(webid) {
        var name = 'Unknown';
        var picture = 'img/icon-blue.svg';
        if (webid && webid.length > 0) {
            var author = authors[webid];
            if (author && author.name) {
                name = author.name;
            }
            if (author && author.picture) {
                picture = author.picture;
            }
        }
        return {name: name, picture: picture};
    };

    // get profile data for a given user
    // Returns
    // webid: "https://example.org/user#me"
    // name: "John Doe",
    // picture: "https://example.org/profile.png"
    var getUserProfile = function(webid, g) {
        var profile = {};

        if (!g) {
            return profile;
        }

        var webidRes = $rdf.sym(webid);

        // set webid
        profile.webid = webid;

        // set name
        var name = g.any(webidRes, FOAF('name'));
        if (name && name.value.length > 0) {
            profile.name = name.value;
        } else {
            profile.name = '';
            // use familyName and givenName instead of full name
            var givenName = g.any(webidRes, FOAF('familyName'));
            if (givenName) {
                profile.name += givenName.value;
            }
            var familyName = g.any(webidRes, FOAF('familyName'));
            if (familyName) {
                profile.name += (givenName)?' '+familyName.value:familyName.value;
            }
            // use nick
            if (!givenName && !familyName) {
                var nick = g.any(webidRes, FOAF('nick'));
                if (nick) {
                    profile.name = nick.value;
                }
            }
        }

        // set picture
        var pic, img = g.any(webidRes, FOAF('img'));
        if (img) {
            pic = img;
        } else {
            // check if profile uses depic instead
            var depic = g.any(webidRes, FOAF('depiction'));
            if (depic) {
                pic = depic;
            }
        }
        if (pic && pic.uri.length > 0) {
            profile.picture = pic.uri;
        }

        var inbox = g.any(webidRes, SOLID('inbox'));
        if (inbox) {
            profile.inbox = inbox.uri;
        }

        return profile;
    };

    var confirmDelete = function(url) {
        var msgTitle = (msgs[url].title)?'<br><p><strong>'+msgs[url].title+'</strong></p>':'this post';
        var div = document.createElement('div');
        div.id = 'delete';
        div.classList.add('dialog');
        var section = document.createElement('section');
        section.innerHTML = "<p>You are about to delete "+msgTitle+"</p>";
        section.innerHTML += "<p>"+url+"</p>";
        div.appendChild(section);

        var footer = document.createElement('footer');

        var del = document.createElement('a');
        del.classList.add("action-button");
        del.classList.add('danger');
        del.classList.add('float-left');
        del.setAttribute('onclick', 'Inbox.deleteMessage(\''+url+'\')');
        del.innerHTML = 'Delete';
        footer.appendChild(del);
        // delete button
        var cancel = document.createElement('a');
        cancel.classList.add('action-button');
        cancel.classList.add('float-right');
        cancel.setAttribute('onclick', 'Inbox.cancelDelete()');
        cancel.innerHTML = 'Cancel';
        footer.appendChild(cancel);
        div.appendChild(footer);

        // append to body
        document.querySelector('body').appendChild(div);
    };

    var cancelDelete = function() {
        document.getElementById('delete').remove();
    };

    var deleteMessage = function(url) {
        if (url) {
            Solid.web.del(url).then(
                function(done) {
                    if (done) {
                        delete msgs[url];
                        document.getElementById(url).remove();
                        document.getElementById('delete').remove();
                        notify('success', 'Successfully deleted post');
                        resetAll();
                    }
                }
            )
            .catch(
                function(err) {
                    notify('error', 'Could not delete post');
                    resetAll();
                }
            );
        }
    };

    // Mark a message as unread
    var markRead = function(url) {
        var toDel = [];
        var toIns = [];
        var st = msgs[url].statements;
        for (var i=0; i<st.length; i++) {
            if (st[i] && st[i].predicate.uri == SIOC('viewed_by')) {
                toDel.push(st[i].toNT());
                break;
            }
        }
        toIns.push($rdf.sym(url).toString() + ' ' + SIOC('viewed_by').toString() + ' ' + $rdf.sym(user.webid).toString() + ' .');
        Solid.web.patch(url, toDel, toIns).then(function(meta) {
            msgs[url].read = true;
            updateMessage(msgs[url]);
        }).catch(function(err) {
            showError(err);
        });
    };

    // Mark a message as unread
    var markUnread = function(url) {
        var toDel = [];
        var toIns = [];
        var st = msgs[url].statements;
        for (var i=0; i<st.length; i++) {
            if (st[i] && st[i].predicate.uri == SIOC('viewed_by').uri) {
                toDel.push(st[i].toNT());
                break;
            }
        }
        console.log(url, toDel, toIns);
        Solid.web.patch(url, toDel, toIns).then(function(meta) {
            msgs[url].read = false;
            updateMessage(msgs[url]);
        }).catch(function(err) {
            showError(err);
        });
    };

    // Update a DOM message with new message data
    var updateMessage = function(msg) {
        msgs[msg.url] = msg;
        var list = (msg.read)?document.getElementById('read'):document.getElementById('unread');
        list.replaceChild(msgToHTML(msg), document.getElementById(msg.url));
    }

    // Transform a message (object) to HTML
    var msgToHTML = function(msg) {
        var author = authors[msg.author];
        var element = document.createElement('li');
        element.id = msg.url;

        var span = document.createElement('span');
        span.classList.add('date');
        span.innerHTML = formatDate(msg.created);
        element.appendChild(span);

        // create header
        var header = document.createElement('header');
        header.classList.add('msg-header');
        // append header to article
        element.appendChild(header);

        // set avatar
        var avatar = document.createElement('img');
        avatar.classList.add('msg-picture');
        avatar.src = author.picture;
        avatar.alt = avatar.title = author.name+"'s picture";
        // append picture to header
        var avatarLink = document.createElement('a');
        avatarLink.href = msg.author;
        avatarLink.setAttribute('target', '_blank');
        avatarLink.appendChild(avatar);
        header.appendChild(avatarLink);

        // create meta author
        var metaAuthor = document.createElement('a');
        metaAuthor.classList.add('msg-author');
        metaAuthor.href = msg.author;
        metaAuthor.setAttribute('target', '_blank');
        metaAuthor.innerHTML = author.name;
        // append meta author to meta
        header.appendChild(metaAuthor);

        var h1 = document.createElement('h1');
        h1.innerHTML = '<a href="'+msg.url+'" class="msg-title" target="_blank" title="'+msg.title+'">'+msg.title+'</a>';
        element.appendChild(h1);

        var body = document.createElement('p');
        body.innerHTML = msg.body.linkify();
        element.appendChild(body);

        var footer = document.createElement('footer');
        // edit button
        var mark = document.createElement('a');
        mark.classList.add("action-button");
        mark.classList.add("action-button-sm");
        console.log("Read:",msg.read);
        if (msg.read) {
            mark.setAttribute('onclick', 'Inbox.markUnread(\''+msg.url+'\')');
            mark.setAttribute('title', 'Mark unread');
            mark.innerHTML = 'Mark unread';
        } else {
            mark.setAttribute('onclick', 'Inbox.markRead(\''+msg.url+'\')');
            mark.setAttribute('title', 'Mark read');
            mark.innerHTML = 'Mark read';
        }
        footer.appendChild(mark);
        // delete button
        var del = document.createElement('a');
        del.classList.add('action-button');
        del.classList.add('action-button-sm');
        del.classList.add('danger-text');
        del.setAttribute('onclick', 'Inbox.confirmDelete(\''+msg.url+'\')');
        del.innerHTML = 'Delete';
        footer.appendChild(del);

        // append footer to post
        element.appendChild(footer);

        return element;
    };

    // formatDate
    var formatDate = function(date, style) {
        style = style || 'LL';
        if (moment().diff(moment(date), 'days') > 1) {
            return moment(date).format(style);
        } else {
            return moment(date).fromNow();
        }
    };

     // Log user in
    var login = function() {
        // Get the current user
        Solid.auth.login().then(function(webid){
            gotWebID(webid);
        }).catch(function(err) {
            console.log(err);
            notify('error', "Authentication failed");
            showError(err);
        });
    };
    // Signup for a WebID and space
    var signup = function() {
        Solid.auth.signup().then(function(webid) {
            gotWebID(webid);
        }).catch(function(err) {
            console.log("Err", err);
            notify('error', "Authentication failed");
            showError(err);
        });
    };
    // Log user out
    var logout = function() {
        user = defaultUser;
        clearLocalStorage();
        showLogin();
        window.location.reload();
    };

    var showLogin = function() {
        document.getElementById('init').classList.remove('hidden');
    };
    var hideLogin = function() {
        document.getElementById('init').classList.add('hidden');
    };

    // set the logged in user
    var gotWebID = function(webid) {
        // set WebID
        user.webid = webid;
        user.authenticated = true;
        hideLogin();
        // fetch and set user profile
        Solid.identity.getProfile(webid).then(function(g) {
            var profile = getUserProfile(webid, g);
            user.name = profile.name;
            user.picture = profile.picture;
            user.date = Date.now();
            // set inbox
            user.inbox = profile.inbox;
            if (user.inbox) {
                loadInbox(user.inbox);
            }
            // add self to authors list
            authors[webid] = user;
            saveLocalAuthors();
            saveLocalStorage();
        });
    };

    // Websocket
    var connectToSocket = function(wss, uri) {
        if (!webSockets[wss]) {
            var socket = new WebSocket(wss);
            socket.onopen = function(){
                this.send('sub ' + uri);
            }
            socket.onmessage = function(msg){
                if (msg.data && msg.data.slice(0, 3) === 'pub') {
                    // resource updated
                    var res = trim(msg.data.slice(3, msg.data.length));
                    console.log("Got new message: pub", res);
                    loadInbox(res, true); //refetch posts and notify
                }
            }
            socket.onclose = function() {
                console.log("Websocket connection closed. Restarting...");
                connectToSocket(wss, uri);
            }
            webSockets[wss] = socket;
        }
    };

    // Subscribe to changes to a URL
    var socketSubscribe = function(wss, url) {
        if (webSockets[wss]) {
            webSockets[wss].send('sub '+url);
        } else {
            connectToSocket(wss, url);
        }
    };

    var notify = function(ntype, text, timeout) {
        timeout = timeout || 1500;
        var note = document.createElement('div');
        note.classList.add('note');
        note.innerHTML = text;
        note.addEventListener('click', note.remove, false);

        switch (ntype) {
            case 'success':
                note.classList.add('success');
                break;
            case 'error':
                timeout = 3000;
                note.classList.add('danger');
                var tip = document.createElement('small');
                tip.classList.add('small');
                tip.innerHTML = ' Tip: check console for debug information.';
                note.appendChild(tip);
                break;
            case 'sticky':
                timeout = 0;
                note.classList.add('dark');
                note.innerHTML += ' <small>[dismiss]</small>'
                break;
            default:
                note.classList.add('dark');
        }
        document.querySelector('body').appendChild(note);
        if (timeout > 0) {
            setTimeout(function() {
                note.remove();
            }, timeout);
        }
    };

    // Send a browser notification
    var growl = function(type, body, timeout) {
        var icon = 'img/icon.png';
        if (!timeout) {
            var timeout = 2000;
        }

        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
        }

        // At last, if the user already denied any notification, and you
        // want to be respectful there is no need to bother him any more.
        // Let's check if the user is okay to get some notification
        if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            var notification = new Notification(type, {
                dir: "auto",
                lang: "",
                icon: icon,
                body: body,
                tag: "notif"
            });
            setTimeout(function() { notification.close(); }, timeout);
        }
    };
    // Authorize browser notifications
    function authorizeNotifications() {
        var status = getNotifStatus();
        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
        }

        if (status !== 'granted') {
            Notification.requestPermission(function (permission) {
                // Whatever the user answers, we make sure we store the information
                Notification.permission = permission;
            });
        } else if (status === 'granted') {
            Notification.permission = 'denied';
        }
    };
    // Browser notifications status
    function getNotifStatus() {
        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return undefined
        } else {
            return Notification.permission;
        }
    };

    // escape HTML code
    var encodeHTML = function (html) {
        return html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    var decodeHTML = function (html) {
        return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#039;/g, "'");
    };
    // sanitize strings
    var trim = function(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    // compute length of objects based on its keys
    var len = function(obj) {
        return Object.keys(obj).length;
    };

    // Turn string http:// URIs into links
    if(!String.linkify) {
        String.prototype.linkify = function() {
            // http://, https://, ftp://
            var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
            // www. sans http:// or https://
            var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
            // Email addresses
            var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
            return this
                .replace(urlPattern, '<a href="$&" target="_blank">$&</a>')
                .replace(pseudoUrlPattern, '$1<a href="http://$2" target="_blank">$2</a>')
                .replace(emailAddressPattern, '<a href="mailto:$&" target="_blank">$&</a>');
        };
    }

    // Overlay
    var toggleInfo = function() {
        var overlay = document.getElementById('webid-info');
        overlay.addEventListener('click', toggleInfo);
        overlay.style.visibility = (overlay.style.visibility == "visible") ? "hidden" : "visible";
    };

    // reset to initial view
    var resetAll = function() {
        hideLoading();

        window.history.pushState("", document.querySelector('title').value, window.location.pathname);
    };

    // loading animation
    var hideLoading = function() {
        document.getElementById('loading').classList.add('hidden');
    }
    var showLoading = function() {
        document.getElementById('loading').classList.remove('hidden');
    }

    // save authors to localStorage
    var saveLocalAuthors = function() {
        try {
            localStorage.setItem(appURL+'authors', JSON.stringify(authors));
        } catch(err) {
            console.log(err);
        }
    };
    // clear localstorage authors data
    var clearLocalAuthors = function() {
        try {
            localStorage.removeItem(appURL+'authors');
        } catch(err) {
            console.log(err);
        }
    };
    // clear localstorage config data
    var loadLocalAuthors = function() {
        try {
            var data = JSON.parse(localStorage.getItem(appURL+'authors'));
            if (data) {
                authors = data;
            }
        } catch(err) {
            console.log(err);
        }
    };

    // save config data to localStorage
    var saveLocalStorage = function() {
        var data = {
            user: user,
            config: config
        };
        try {
            localStorage.setItem(appURL, JSON.stringify(data));
        } catch(err) {
            console.log(err);
        }
    };
    // clear localstorage config data
    var clearLocalStorage = function() {
        try {
            localStorage.removeItem(appURL);
        } catch(err) {
            console.log(err);
        }
    };
    var loadLocalStorage = function() {
        try {
            var data = JSON.parse(localStorage.getItem(appURL));
            if (data) {
                // don't let session data become stale (24h validity)
                var dateValid = data.user.date + 1000 * 60 * 60 * 24;
                if (Date.now() < dateValid) {
                    config = data.config;
                    user = data.user;
                    if (user.authenticated) {
                        hideLogin();
                    }
                    if (user.inbox) {
                        loadInbox(user.inbox);
                    }
                } else {
                    console.log("Deleting localStorage data because it expired");
                    localStorage.removeItem(appURL);
                }
            } else {
                // clear sessionStorage in case there was a change to the data structure
                localStorage.removeItem(appURL);
            }
        } catch(err) {
            notify('sticky', 'You have disabled cookies. Persistence functionality is disabled.');
            console.log(err);
        }
    };



    init();



    // return public functions
    return {
        loadInbox: loadInbox,
        loadMessage: loadMessage,
        toggleInfo: toggleInfo,
        deleteMessage: deleteMessage,
        confirmDelete: confirmDelete,
        cancelDelete: cancelDelete,
        markRead: markRead,
        markUnread: markUnread,
        login: login,
        logout: logout,
    };
}(this));