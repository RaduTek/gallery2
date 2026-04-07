var appTitle = "Gallery";

function log() {
    if (window.console && window.console.log) {
        try {
            window.console.log.apply(window.console, arguments);
        } catch (e) {}
    }
}

var Loader = {
    config: {
        text: "Loading..."
    },
    state: {
        inTimeout: null,
        timeout: null,
        defaultText: "Loading..."
    },
    show: function (options) {
        if (!options) options = this.config;

        $("#loaderText").text(options.text || this.config.text);

        if (options.timeout) {
            this.state.timeout = window.setTimeout(function () {
                Loader.hide();
            }, options.timeout);
        }

        if (options.inTimeout) {
            this.state.inTimeout = window.setTimeout(function () {
                $("#loader").addClass("visible");
            }, options.inTimeout);
        } else {
            $("#loader").addClass("visible");
        }
    },
    hide: function () {
        $("#loader").removeClass("visible");

        if (this.state.timeout) {
            window.clearTimeout(this.state.timeout);
            this.state.timeout = null;
        }

        if (this.state.inTimeout) {
            window.clearTimeout(this.state.inTimeout);
            this.state.inTimeout = null;
        }
    }
};

var View = {
    config: {
        animDuration: 450
    },
    state: {
        host: null,
        stack: [],
        current: null,
        previous: null
    },
    init: function (host) {
        this.state.host = $(host);

        $(window).on("viewChanged", function (event, viewChangeData) {
            log("View changed", viewChangeData);

            viewChangeData.current.find(".navbar").each(function () {
                var adjustFunc = $(this).data("adjust");
                if (adjustFunc) {
                    adjustFunc();
                }
            });
        });
    },
    create: function (props) {
        if (!props) props = {};

        var view = $("<div class='view'></div>");

        if (props.class) {
            view.addClass(props.class);
        }

        if (props.topEl) {
            var viewTop = $("<div class='viewTop'></div>");
            props.viewTop = viewTop;
            viewTop.append(props.topEl);
            view.append(viewTop);

            if (props.topClass) {
                viewTop.addClass(props.topClass);
            }
        }

        if (props.bottomEl) {
            var viewBottom = $("<div class='viewBottom'></div>");
            props.viewBottom = viewBottom;
            viewBottom.append(props.bottomEl);
            view.append(viewBottom);

            if (props.bottomClass) {
                viewBottom.addClass(props.bottomClass);
            }
        }

        if (props.content) {
            var viewContent = $("<div class='viewContent'></div>");
            props.viewContent = viewContent;
            viewContent.append(props.content);
            view.append(viewContent);

            if (props.contentClass) {
                viewContent.addClass(props.contentClass);
            }
        }

        view.props = props;

        return view;
    },
    add: function (view, options) {
        if (view.added) return;

        if (!options) options = {};

        if (options.insertBeforeCurrent) {
            var currentIndex = this.state.stack.indexOf(this.state.current);
            if (currentIndex !== -1) {
                options.insertAt = currentIndex;
            }
        }

        if (options.insertAt !== undefined) {
            this.state.stack.splice(options.insertAt, 0, view);
        } else {
            this.state.stack.push(view);
        }

        this.state.host.append(view);
        view.added = true;
    },
    activate: function (view, options) {
        if (this.state.current === view) return;
        if (!view.added) {
            this.add(view);
        }
        if (!options) options = {};

        if (options.anim && options.anim.inDirection) {
            view.addClass(options.anim.inDirection);
            setTimeout(function () {
                view.removeClass(options.anim.inDirection);
            }, this.config.animDuration);
        }

        view.addClass("active");
        this.state.current = view;
    },
    deactivate: function (view, options) {
        if (!view) return;
        if (!options) options = {};

        if (options.anim && options.anim.outDirection) {
            view.addClass(options.anim.outDirection);
            setTimeout(function () {
                view.removeClass("active " + options.anim.outDirection);
            }, this.config.animDuration);
        } else {
            view.removeClass("active");
        }
    },
    back: function (options) {
        console.log("Going back!");
        if (this.state.stack.length < 2) return false;
        if (!options) options = {};

        var currentView = this.state.stack.pop(); // Remove current view
        var previousView = this.state.stack[this.state.stack.length - 1];

        if (!options.anim) {
            options.anim = {
                outDirection: "toRight",
                inDirection: "fromLeft"
            };
        }

        this.deactivate(currentView, options);
        this.activate(previousView, options);

        window.setTimeout(function () {
            currentView.remove();
        }, 300);

        $(window).trigger("viewChanged", {
            reason: "back",
            current: previousView,
            previous: currentView
        });

        return true;
    },
    go: function (view, options) {
        if (!view) return false;
        if (!options) options = {};

        var previousView = this.state.current;

        if (!options.anim && previousView) {
            options.anim = {
                outDirection: "toLeft",
                inDirection: "fromRight"
            };
        }

        if (previousView) {
            this.deactivate(previousView, options);
        }
        this.activate(view, options);

        $(window).trigger("viewChanged", {
            reason: "go",
            current: view,
            previous: previousView
        });

        return true;
    }
};

function Navbar(options) {
    if (!options) options = {};

    var navbar = $("<div class='navbar'></div>");

    var leftContainer = $("<div class='navbarLeft'></div>");
    leftContainer.append(options.leftItems);
    navbar.append(leftContainer);

    var centerContainer = $("<div class='navbarCenter'></div>");
    centerContainer.append(options.centerItems);
    if (options.title) {
        var titleContainer = $("<span class='navbarTitle'></span>");
        titleContainer.text(options.title);
        centerContainer.append(titleContainer);
    }
    navbar.append(centerContainer);

    var rightContainer = $("<div class='navbarRight'></div>");
    rightContainer.append(options.rightItems);
    navbar.append(rightContainer);

    navbar.data("adjust", function () {
        log("Navbar adjust");
        var leftWidth = leftContainer.outerWidth() || 0;
        var rightWidth = rightContainer.outerWidth() || 0;
        var maxSideWidth = Math.max(leftWidth, rightWidth) + 6;
        var navbarWidth = navbar.innerWidth() || 0;
        var availableSpace = navbarWidth - maxSideWidth * 2 - 12;

        // Use symmetric side offsets only when center content can fit.
        centerContainer.css("left", "");
        centerContainer.css("right", "");
        window.setTimeout(function () {
            var centerContentWidth = titleContainer.outerWidth() || 0;

            log("Navbar widths", {
                leftWidth: leftWidth,
                rightWidth: rightWidth,
                navbarWidth: navbarWidth,
                availableSpace: availableSpace,
                centerContentWidth: centerContentWidth,
                maxSideWidth: maxSideWidth
            });

            if (centerContentWidth <= availableSpace) {
                centerContainer.css("left", maxSideWidth);
                centerContainer.css("right", maxSideWidth);
            } else {
                centerContainer.css("left", leftWidth + 6 + "px");
                centerContainer.css("right", rightWidth + 6 + "px");
            }
        }, 1);
    });

    return navbar;
}

function NavbarButton(options) {
    if (!options) options = {};

    var button = $("<button class='navbar-button'></button>");
    if (options.text) {
        button.text(options.text);
    }
    if (options.onClick) {
        button.on("click", options.onClick);
    }
    if (options.id) {
        button.attr("id", options.id);
    }
    if (options.class) {
        button.addClass(options.class);
    }

    return button;
}

function GalleryViewItem(props) {
    var itemDiv = $("<div class='item'></div>");

    var showName = false;

    if (props.has_thumb) {
        var thumbUrl = "/thumb" + props.path;
        $("<img class='thumbnail' />")
            .attr("data-src", thumbUrl)
            .appendTo(itemDiv);
    } else {
        showName = true;
    }

    itemDiv.addClass(props.type);

    if (props.type === "dir") {
        itemDiv.on("click", function () {
            GalleryView({ path: props.path });
        });

        showName = true;
    }

    if (props.type === "image" || props.type === "video") {
        itemDiv.on("click", function () {
            ImageView(props);
        });
    }

    if (showName) {
        itemDiv.append("<div class='itemName'>" + props.name + "</div>");
    }

    return itemDiv;
}

function GalleryViewLoadVisibleThumbnails(view) {
    if (!view || !view.props || !view.props.viewContent) return;

    /** @type JQuery<HTMLElement> */
    var container = view.props.viewContent;
    var containerEl = container[0];
    if (!containerEl) return;

    var getOffsetTopWithin = function (el, parentEl) {
        var top = 0;
        while (el && el !== parentEl) {
            top += el.offsetTop || 0;
            el = el.offsetParent;
        }
        return top;
    };

    var scrollTop = containerEl.scrollTop || 0;
    var viewportBottom =
        scrollTop + (containerEl.clientHeight || container.height());
    var preloadOffset = 200;

    container.find("img.thumbnail[data-src]").each(function () {
        var img = $(this);
        var imgTop = getOffsetTopWithin(this, containerEl);
        var imgBottom = imgTop + (this.offsetHeight || 0);
        var isVisible =
            imgBottom >= scrollTop - preloadOffset &&
            imgTop <= viewportBottom + preloadOffset;

        if (isVisible) {
            img.attr("src", img.attr("data-src"));
            img.removeAttr("data-src");
        }
    });
}

function GalleryViewLazyLoad(view) {
    if (!view || !view.props || !view.props.viewContent) return;

    /** @type JQuery<HTMLElement> */
    var container = view.props.viewContent;
    var scheduled = false;
    var requestFrame =
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 16);
        };

    var onScroll = function () {
        if (scheduled) return;
        scheduled = true;

        requestFrame(function () {
            scheduled = false;
            GalleryViewLoadVisibleThumbnails(view);
        });
    };

    var scrollTimeout;
    var onScrollDebounced = function () {
        if (scrollTimeout) {
            window.clearTimeout(scrollTimeout);
        }
        scrollTimeout = window.setTimeout(onScroll, 120);
    };

    container
        .off("scroll.lazyThumb touchmove.lazyThumb")
        .on("scroll.lazyThumb touchmove.lazyThumb", onScrollDebounced);
    onScroll();

    // Some older Safari builds need a delayed pass after layout/paint settles.
    window.setTimeout(onScroll, 60);
}

function GalleryView(props) {
    var path = props.path;
    log("Loading directory view for path:", path);

    Loader.show({ text: "Loading", inTimeout: 200 });

    $.getJSON("/list" + path, function (data) {
        data.path = path;

        var navbar = Navbar({
            title: data.name || appTitle,
            leftItems: data.parent && [
                NavbarButton({
                    text: data.parent || "Back",
                    onClick: function () {
                        if (!View.back()) {
                            GalleryView({
                                path: data.parent_path,
                                backNav: true
                            });
                        }
                    }
                })
            ]
        });

        var galleryView = $("<div class='galleryView'></div>");

        var view = View.create({
            topEl: navbar,
            content: galleryView,
            contentClass: "scrollable"
        });
        view.GalleryViewProps = props;

        if (data.error) {
            view.append("<div class='error'>" + data.error + "</div>");
        } else {
            $.each(data.items, function (index, item) {
                item.index = index;
                if (data.path === "/") {
                    item.path = "/" + item.name;
                } else {
                    item.path = data.path + "/" + item.name;
                }
                item.parent = data.name;
                item.parentDir = data;
                var itemDiv = GalleryViewItem(item);
                galleryView.append(itemDiv);
            });
        }

        if (props.backNav) {
            View.add(view, { insertBeforeCurrent: true });
            View.back();
        } else {
            View.go(view);
        }
        GalleryViewLazyLoad(view);
        Loader.hide();
    });
}

function ImageView(props) {
    log("Loading image view for path:", props.path);

    var navbar = Navbar({
        title: props.name,
        leftItems: [
            NavbarButton({
                text: props.parent || "Back",
                onClick: function () {
                    View.back();
                }
            })
        ]
    });

    var content = $("<div id='imageView'></div>");

    if (props.type === "image") {
        var imgUrl = "/preview" + props.path;
        $("<img id='imageViewImage' />").attr("src", imgUrl).appendTo(content);
        // } else if (props.type === "video") {
    } else {
        var videoUrl = "/content" + props.path;
        $("<video id='imageViewVideo' controls autoplay />")
            .attr("src", videoUrl)
            .appendTo(content);
    }

    var view = View.create({
        topEl: navbar,
        content: content
    });

    View.go(view);
}

$(function () {
    View.init("#viewHost");

    $(window).on("viewChanged", function (event, viewChangeData) {
        if (viewChangeData.current && viewChangeData.current.GalleryViewProps) {
            localStorage.setItem(
                "lastPath",
                viewChangeData.current.GalleryViewProps.path
            );
        }
    });

    path = localStorage.getItem("lastPath") || "/";
    GalleryView({ path: path });

    log("Init finished");
});

/*! iNoBounce - v0.2.0
 * https://github.com/lazd/iNoBounce/
 * Copyright (c) 2013 Larry Davis <lazdnet@gmail.com>; Licensed BSD */
(function (global) {
    // Stores the Y position where the touch started
    var startY = 0;

    // Store enabled status
    var enabled = false;

    var supportsPassiveOption = false;
    try {
        var opts = Object.defineProperty({}, "passive", {
            get: function () {
                supportsPassiveOption = true;
            }
        });
        window.addEventListener("test", null, opts);
    } catch (e) {}

    var handleTouchmove = function (evt) {
        // Get the element that was scrolled upon
        var el = evt.target;

        // Allow zooming
        var zoom =
            window.innerWidth / window.document.documentElement.clientWidth;
        if (evt.touches.length > 1 || zoom !== 1) {
            return;
        }

        // Check all parent elements for scrollability
        while (el !== document.body && el !== document) {
            // Get some style properties
            var style = window.getComputedStyle(el);

            if (!style) {
                // If we've encountered an element we can't compute the style for, get out
                break;
            }

            // Ignore range input element
            if (
                el.nodeName === "INPUT" &&
                el.getAttribute("type") === "range"
            ) {
                return;
            }

            var scrolling = style.getPropertyValue(
                "-webkit-overflow-scrolling"
            );
            var overflowY = style.getPropertyValue("overflow-y");
            var height = parseInt(style.getPropertyValue("height"), 10);

            // Determine if the element should scroll
            var isScrollable =
                scrolling === "touch" &&
                (overflowY === "auto" || overflowY === "scroll");
            var canScroll = el.scrollHeight > el.offsetHeight;

            if (isScrollable && canScroll) {
                // Get the current Y position of the touch
                var curY = evt.touches ? evt.touches[0].screenY : evt.screenY;

                // Determine if the user is trying to scroll past the top or bottom
                // In this case, the window will bounce, so we have to prevent scrolling completely
                var isAtTop = startY <= curY && el.scrollTop === 0;
                var isAtBottom =
                    startY >= curY && el.scrollHeight - el.scrollTop === height;

                // Stop a bounce bug when at the bottom or top of the scrollable element
                if (isAtTop || isAtBottom) {
                    evt.preventDefault();
                }

                // No need to continue up the DOM, we've done our job
                return;
            }

            // Test the next parent
            el = el.parentNode;
        }

        // Stop the bouncing -- no parents are scrollable
        evt.preventDefault();
    };

    var handleTouchstart = function (evt) {
        // Store the first Y position of the touch
        startY = evt.touches ? evt.touches[0].screenY : evt.screenY;
    };

    var enable = function () {
        // Listen to a couple key touch events
        window.addEventListener(
            "touchstart",
            handleTouchstart,
            supportsPassiveOption ? { passive: false } : false
        );
        window.addEventListener(
            "touchmove",
            handleTouchmove,
            supportsPassiveOption ? { passive: false } : false
        );
        enabled = true;
    };

    var disable = function () {
        // Stop listening
        window.removeEventListener("touchstart", handleTouchstart, false);
        window.removeEventListener("touchmove", handleTouchmove, false);
        enabled = false;
    };

    var isEnabled = function () {
        return enabled;
    };

    // Enable by default if the browser supports -webkit-overflow-scrolling
    // Test this by setting the property with JavaScript on an element that exists in the DOM
    // Then, see if the property is reflected in the computed style
    var testDiv = document.createElement("div");
    document.documentElement.appendChild(testDiv);
    testDiv.style.WebkitOverflowScrolling = "touch";
    var isScrollSupported =
        "getComputedStyle" in window &&
        window.getComputedStyle(testDiv)["-webkit-overflow-scrolling"] ===
            "touch";
    document.documentElement.removeChild(testDiv);

    if (isScrollSupported) {
        enable();
    }

    // A module to support enabling/disabling iNoBounce
    var iNoBounce = {
        enable: enable,
        disable: disable,
        isEnabled: isEnabled,
        isScrollSupported: isScrollSupported
    };

    if (typeof module !== "undefined" && module.exports) {
        // Node.js Support
        module.exports = iNoBounce;
    }
    if (typeof global.define === "function") {
        // AMD Support
        (function (define) {
            define("iNoBounce", [], function () {
                return iNoBounce;
            });
        })(global.define);
    } else {
        // Browser support
        global.iNoBounce = iNoBounce;
    }
})(this);
