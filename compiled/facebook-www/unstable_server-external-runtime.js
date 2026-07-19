(function () {
  function handleExistingNodes(target) {
    target = target.querySelectorAll("template");
    for (var i = 0; i < target.length; i++) handleNode(target[i]);
  }
  function installFizzInstrObserver(target) {
    function handleMutations(mutations) {
      for (var i = 0; i < mutations.length; i++)
        for (
          var addedNodes = mutations[i].addedNodes, j = 0;
          j < addedNodes.length;
          j++
        )
          addedNodes[j].parentNode && handleNode(addedNodes[j]);
    }
    var fizzInstrObserver = new MutationObserver(handleMutations);
    fizzInstrObserver.observe(target, { childList: !0 });
    window.addEventListener("DOMContentLoaded", function () {
      handleMutations(fizzInstrObserver.takeRecords());
      fizzInstrObserver.disconnect();
    });
  }
  function handleNode(node_) {
    if (1 === node_.nodeType && node_.dataset) {
      var dataset = node_.dataset;
      null != dataset.rxi
        ? ($RX(
            dataset.bid,
            dataset.dgst,
            dataset.msg,
            dataset.stck,
            dataset.cstck
          ),
          node_.remove())
        : null != dataset.rri
          ? ($RR(dataset.bid, dataset.sid, JSON.parse(dataset.sty)),
            node_.remove())
          : null != dataset.rci
            ? ($RC(dataset.bid, dataset.sid), node_.remove())
            : null != dataset.rsi &&
              ($RS(dataset.sid, dataset.pid), node_.remove());
    }
  }
  var $RT;
  var $RM = new Map();
  var $RB = [];
  var $RX = function (
    suspenseBoundaryID,
    errorDigest,
    errorMsg,
    errorStack,
    errorComponentStack
  ) {
    var suspenseIdNode = document.getElementById(suspenseBoundaryID);
    suspenseIdNode &&
      ((suspenseBoundaryID = suspenseIdNode.previousSibling),
      (suspenseBoundaryID.data = "$!"),
      (suspenseIdNode = suspenseIdNode.dataset),
      errorDigest && (suspenseIdNode.dgst = errorDigest),
      errorMsg && (suspenseIdNode.msg = errorMsg),
      errorStack && (suspenseIdNode.stck = errorStack),
      errorComponentStack && (suspenseIdNode.cstck = errorComponentStack),
      suspenseBoundaryID._reactRetry && suspenseBoundaryID._reactRetry());
  };
  var $RV = function (revealBoundaries, batch) {
    function applyViewTransitionName(element, classAttributeName) {
      var className = element.getAttribute(classAttributeName);
      className &&
        ((classAttributeName = element.style),
        restoreQueue.push(
          element,
          classAttributeName.viewTransitionName,
          classAttributeName.viewTransitionClass
        ),
        "auto" !== className &&
          (classAttributeName.viewTransitionClass = className),
        (element = element.getAttribute("vt-name")) ||
          (element = "_T_" + autoNameIdx++ + "_"),
        (element =
          CSS.escape(element) !== element
            ? "r-" + btoa(element).replace(/=/g, "")
            : element),
        (classAttributeName.viewTransitionName = element),
        (shouldStartViewTransition = !0));
    }
    var shouldStartViewTransition = !1,
      autoNameIdx = 0,
      restoreQueue = [];
    try {
      var existingTransition = document.__reactViewTransition;
      if (existingTransition) {
        existingTransition.finished.finally($RV.bind(null, batch));
        return;
      }
      var appearingViewTransitions = new Map();
      for (
        existingTransition = 1;
        existingTransition < batch.length;
        existingTransition += 2
      )
        for (
          var appearingElements =
              batch[existingTransition].querySelectorAll("[vt-share]"),
            j = 0;
          j < appearingElements.length;
          j++
        ) {
          var appearingElement = appearingElements[j];
          appearingViewTransitions.set(
            appearingElement.getAttribute("vt-name"),
            appearingElement
          );
        }
      var suspenseyImages = [];
      for (
        appearingElements = 0;
        appearingElements < batch.length;
        appearingElements += 2
      ) {
        var suspenseIdNode = batch[appearingElements],
          parentInstance = suspenseIdNode.parentNode;
        if (parentInstance) {
          var parentRect = parentInstance.getBoundingClientRect();
          if (
            parentRect.left ||
            parentRect.top ||
            parentRect.width ||
            parentRect.height
          ) {
            appearingElement = suspenseIdNode;
            for (existingTransition = 0; appearingElement; ) {
              if (8 === appearingElement.nodeType) {
                var data = appearingElement.data;
                if ("/$" === data)
                  if (0 === existingTransition) break;
                  else existingTransition--;
                else
                  ("$" !== data &&
                    "$?" !== data &&
                    "$~" !== data &&
                    "$!" !== data) ||
                    existingTransition++;
              } else if (1 === appearingElement.nodeType) {
                j = appearingElement;
                var exitName = j.getAttribute("vt-name"),
                  pairedElement = appearingViewTransitions.get(exitName);
                applyViewTransitionName(
                  j,
                  pairedElement ? "vt-share" : "vt-exit"
                );
                pairedElement &&
                  (applyViewTransitionName(pairedElement, "vt-share"),
                  appearingViewTransitions.set(exitName, null));
                for (
                  var disappearingElements = j.querySelectorAll("[vt-share]"),
                    j$1 = 0;
                  j$1 < disappearingElements.length;
                  j$1++
                ) {
                  var disappearingElement = disappearingElements[j$1],
                    name = disappearingElement.getAttribute("vt-name"),
                    appearingElement$2 = appearingViewTransitions.get(name);
                  appearingElement$2 &&
                    (applyViewTransitionName(disappearingElement, "vt-share"),
                    applyViewTransitionName(appearingElement$2, "vt-share"),
                    appearingViewTransitions.set(name, null));
                }
                var relayExitElements = j.querySelectorAll("[vt-parent-exit]");
                for (j = 0; j < relayExitElements.length; j++)
                  applyViewTransitionName(
                    relayExitElements[j],
                    "vt-parent-exit"
                  );
              }
              appearingElement = appearingElement.nextSibling;
            }
            for (
              var contentNode$4 = batch[appearingElements + 1],
                enterElement = contentNode$4.firstElementChild;
              enterElement;

            ) {
              null !==
                appearingViewTransitions.get(
                  enterElement.getAttribute("vt-name")
                ) && applyViewTransitionName(enterElement, "vt-enter");
              var relayEnterElements =
                enterElement.querySelectorAll("[vt-parent-enter]");
              for (
                appearingElement = 0;
                appearingElement < relayEnterElements.length;
                appearingElement++
              )
                applyViewTransitionName(
                  relayEnterElements[appearingElement],
                  "vt-parent-enter"
                );
              enterElement = enterElement.nextElementSibling;
            }
            appearingElement = parentInstance;
            do
              for (
                var childElement = appearingElement.firstElementChild;
                childElement;

              ) {
                var updateClassName = childElement.getAttribute("vt-update");
                updateClassName &&
                  "none" !== updateClassName &&
                  !restoreQueue.includes(childElement) &&
                  applyViewTransitionName(childElement, "vt-update");
                childElement = childElement.nextElementSibling;
              }
            while (
              (appearingElement = appearingElement.parentNode) &&
              1 === appearingElement.nodeType &&
              "none" !== appearingElement.getAttribute("vt-update")
            );
            var appearingImages = contentNode$4.querySelectorAll(
              'img[src]:not([loading="lazy"])'
            );
            suspenseyImages.push.apply(suspenseyImages, appearingImages);
          }
        }
      }
      if (shouldStartViewTransition) {
        var transition = (document.__reactViewTransition =
          document.startViewTransition({
            update: function () {
              revealBoundaries(batch);
              for (
                var blockingPromises = [
                    document.documentElement.clientHeight,
                    document.fonts.ready
                  ],
                  $jscomp$loop$9 = {},
                  i$6 = 0;
                i$6 < suspenseyImages.length;
                $jscomp$loop$9 = {
                  $jscomp$loop$prop$suspenseyImage$10:
                    $jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10
                },
                  i$6++
              )
                if (
                  (($jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10 =
                    suspenseyImages[i$6]),
                  !$jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10.complete)
                ) {
                  var rect =
                    $jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10.getBoundingClientRect();
                  0 < rect.bottom &&
                    0 < rect.right &&
                    rect.top < window.innerHeight &&
                    rect.left < window.innerWidth &&
                    ((rect = new Promise(
                      (function ($jscomp$loop$9) {
                        return function (resolve) {
                          $jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10.addEventListener(
                            "load",
                            resolve
                          );
                          $jscomp$loop$9.$jscomp$loop$prop$suspenseyImage$10.addEventListener(
                            "error",
                            resolve
                          );
                        };
                      })($jscomp$loop$9)
                    )),
                    blockingPromises.push(rect));
                }
              return Promise.race([
                Promise.all(blockingPromises),
                new Promise(function (resolve) {
                  var currentTime = performance.now();
                  setTimeout(
                    resolve,
                    2300 > currentTime && 2e3 < currentTime
                      ? 2300 - currentTime
                      : 500
                  );
                })
              ]);
            },
            types: []
          }));
        transition.ready.finally(function () {
          for (var i$7 = restoreQueue.length - 3; 0 <= i$7; i$7 -= 3) {
            var element = restoreQueue[i$7],
              elementStyle = element.style;
            elementStyle.viewTransitionName = restoreQueue[i$7 + 1];
            elementStyle.viewTransitionClass = restoreQueue[i$7 + 1];
            "" === element.getAttribute("style") &&
              element.removeAttribute("style");
          }
        });
        transition.finished.finally(function () {
          document.__reactViewTransition === transition &&
            (document.__reactViewTransition = null);
        });
        $RB = [];
        return;
      }
    } catch (x) {}
    revealBoundaries(batch);
  }.bind(null, function (batch) {
    $RT = performance.now();
    for (var i = 0; i < batch.length; i += 2) {
      var suspenseIdNode = batch[i],
        contentNode = batch[i + 1];
      null !== contentNode.parentNode &&
        contentNode.parentNode.removeChild(contentNode);
      var parentInstance = suspenseIdNode.parentNode;
      if (parentInstance) {
        var suspenseNode = suspenseIdNode.previousSibling,
          depth = 0;
        do {
          if (suspenseIdNode && 8 === suspenseIdNode.nodeType) {
            var data = suspenseIdNode.data;
            if ("/$" === data || "/&" === data)
              if (0 === depth) break;
              else depth--;
            else
              ("$" !== data &&
                "$?" !== data &&
                "$~" !== data &&
                "$!" !== data &&
                "&" !== data) ||
                depth++;
          }
          data = suspenseIdNode.nextSibling;
          parentInstance.removeChild(suspenseIdNode);
          suspenseIdNode = data;
        } while (suspenseIdNode);
        for (; contentNode.firstChild; )
          parentInstance.insertBefore(contentNode.firstChild, suspenseIdNode);
        suspenseNode.data = "$";
        suspenseNode._reactRetry &&
          requestAnimationFrame(suspenseNode._reactRetry);
      }
    }
    batch.length = 0;
  });
  var $RC = function (suspenseBoundaryID, contentID) {
    if ((contentID = document.getElementById(contentID)))
      (suspenseBoundaryID = document.getElementById(suspenseBoundaryID))
        ? ((suspenseBoundaryID.previousSibling.data = "$~"),
          $RB.push(suspenseBoundaryID, contentID),
          2 === $RB.length &&
            ("number" !== typeof $RT
              ? requestAnimationFrame($RV.bind(null, $RB))
              : ((suspenseBoundaryID = performance.now()),
                (suspenseBoundaryID =
                  2300 > suspenseBoundaryID && 2e3 < suspenseBoundaryID
                    ? 2300 - suspenseBoundaryID
                    : $RT + 300 - suspenseBoundaryID),
                setTimeout($RV.bind(null, $RB), suspenseBoundaryID))))
        : contentID.parentNode.removeChild(contentID);
  };
  var $RR = function (suspenseBoundaryID, contentID, stylesheetDescriptors) {
    function cleanupWith(cb) {
      this._p = null;
      cb();
    }
    for (
      var precedences = new Map(),
        thisDocument = document,
        lastResource,
        node,
        nodes = thisDocument.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ),
        styleTagsToHoist = [],
        i$8 = 0;
      (node = nodes[i$8++]);

    )
      "not all" === node.getAttribute("media")
        ? styleTagsToHoist.push(node)
        : ("LINK" === node.tagName && $RM.set(node.getAttribute("href"), node),
          precedences.set(node.dataset.precedence, (lastResource = node)));
    nodes = 0;
    node = [];
    var precedence, resourceEl;
    for (i$8 = !0; ; ) {
      if (i$8) {
        var stylesheetDescriptor = stylesheetDescriptors[nodes++];
        if (!stylesheetDescriptor) {
          i$8 = !1;
          nodes = 0;
          continue;
        }
        var avoidInsert = !1,
          j = 0;
        var href = stylesheetDescriptor[j++];
        if ((resourceEl = $RM.get(href))) {
          var attr = resourceEl._p;
          avoidInsert = !0;
        } else {
          resourceEl = thisDocument.createElement("link");
          resourceEl.href = href;
          resourceEl.rel = "stylesheet";
          for (
            resourceEl.dataset.precedence = precedence =
              stylesheetDescriptor[j++];
            (attr = stylesheetDescriptor[j++]);

          )
            resourceEl.setAttribute(attr, stylesheetDescriptor[j++]);
          attr = resourceEl._p = new Promise(function (resolve, reject) {
            resourceEl.onload = cleanupWith.bind(resourceEl, resolve);
            resourceEl.onerror = cleanupWith.bind(resourceEl, reject);
          });
          $RM.set(href, resourceEl);
        }
        href = resourceEl.getAttribute("media");
        !attr || (href && !window.matchMedia(href).matches) || node.push(attr);
        if (avoidInsert) continue;
      } else {
        resourceEl = styleTagsToHoist[nodes++];
        if (!resourceEl) break;
        precedence = resourceEl.getAttribute("data-precedence");
        resourceEl.removeAttribute("media");
      }
      avoidInsert = precedences.get(precedence) || lastResource;
      avoidInsert === lastResource && (lastResource = resourceEl);
      precedences.set(precedence, resourceEl);
      avoidInsert
        ? avoidInsert.parentNode.insertBefore(
            resourceEl,
            avoidInsert.nextSibling
          )
        : ((avoidInsert = thisDocument.head),
          avoidInsert.insertBefore(resourceEl, avoidInsert.firstChild));
    }
    if ((stylesheetDescriptors = document.getElementById(suspenseBoundaryID)))
      stylesheetDescriptors.previousSibling.data = "$~";
    Promise.all(node).then(
      $RC.bind(null, suspenseBoundaryID, contentID),
      $RX.bind(null, suspenseBoundaryID, "CSS failed to load")
    );
  };
  var $RS = function (containerID, placeholderID) {
    containerID = document.getElementById(containerID);
    placeholderID = document.getElementById(placeholderID);
    for (
      containerID.parentNode.removeChild(containerID);
      containerID.firstChild;

    )
      placeholderID.parentNode.insertBefore(
        containerID.firstChild,
        placeholderID
      );
    placeholderID.parentNode.removeChild(placeholderID);
  };
  (function () {
    addEventListener("submit", function (event) {
      if (!event.defaultPrevented) {
        var form = event.target,
          submitter = event.submitter,
          action = form.action,
          formDataSubmitter = submitter;
        if (submitter) {
          var submitterAction = submitter.getAttribute("formAction");
          null != submitterAction &&
            ((action = submitterAction), (formDataSubmitter = null));
        }
        "javascript:throw new Error('React form unexpectedly submitted.')" ===
          action &&
          (event.preventDefault(),
          (event = new FormData(form, formDataSubmitter)),
          (action = form.ownerDocument || form),
          (action.$$reactFormReplay = action.$$reactFormReplay || []).push(
            form,
            submitter,
            event
          ));
      }
    });
  })();
  var entries = performance.getEntriesByType
    ? performance.getEntriesByType("paint")
    : [];
  0 < entries.length
    ? ($RT = entries[0].startTime)
    : requestAnimationFrame(function () {
        $RT = performance.now();
      });
  if (null != document.body)
    "loading" === document.readyState &&
      installFizzInstrObserver(document.body),
      handleExistingNodes(document.body);
  else {
    var domBodyObserver = new MutationObserver(function () {
      null != document.body &&
        ("loading" === document.readyState &&
          installFizzInstrObserver(document.body),
        handleExistingNodes(document.body),
        domBodyObserver.disconnect());
    });
    domBodyObserver.observe(document.documentElement, { childList: !0 });
  }
})();
