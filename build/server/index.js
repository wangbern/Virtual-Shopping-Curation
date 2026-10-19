import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, ServerRouter, UNSAFE_withComponentProps, UNSAFE_withErrorBoundaryProps, UNSAFE_withHydrateFallbackProps, isRouteErrorResponse } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Suspense, lazy, useEffect, useState } from "react";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@react-router/dev/dist/config/defaults/entry.server.node.tsx
var entry_server_node_exports = /* @__PURE__ */ __exportAll({
	default: () => handleRequest,
	streamTimeout: () => streamTimeout
});
var streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
	if (request.method.toUpperCase() === "HEAD") return new Response(null, {
		status: responseStatusCode,
		headers: responseHeaders
	});
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		let userAgent = request.headers.get("user-agent");
		let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
		let timeoutId = setTimeout(() => abort(), 6e3);
		const { pipe, abort } = renderToPipeableStream(/* @__PURE__ */ jsx(ServerRouter, {
			context: routerContext,
			url: request.url
		}), {
			[readyOption]() {
				shellRendered = true;
				const body = new PassThrough({ final(callback) {
					clearTimeout(timeoutId);
					timeoutId = void 0;
					callback();
				} });
				const stream = createReadableStreamFromReadable(body);
				responseHeaders.set("Content-Type", "text/html");
				pipe(body);
				resolve(new Response(stream, {
					headers: responseHeaders,
					status: responseStatusCode
				}));
			},
			onShellError(error) {
				reject(error);
			},
			onError(error) {
				responseStatusCode = 500;
				if (shellRendered) console.error(error);
			}
		});
	});
}
//#endregion
//#region app/components/DebugTuner.tsx
var TunePanel = lazy(() => import("./assets/TunePanel-BDlrfDur.js"));
/**
* Desktop-only debug key: press ` (backquote, top-left of the keyboard) to open/close the doll
* tuner on any screen. Never shows on touch devices; the panel code only loads when opened.
*/
function DebugTuner() {
	const [open, setOpen] = useState(false);
	useEffect(() => {
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		const onKey = (e) => {
			if (e.key !== "`" || e.metaKey || e.ctrlKey || e.altKey) return;
			const t = e.target;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
			e.preventDefault();
			setOpen((o) => !o);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Suspense, {
		fallback: null,
		children: /* @__PURE__ */ jsx(TunePanel, { onClose: () => setOpen(false) })
	});
}
//#endregion
//#region app/root.tsx
var root_exports = /* @__PURE__ */ __exportAll({
	ErrorBoundary: () => ErrorBoundary,
	HydrateFallback: () => HydrateFallback,
	Layout: () => Layout,
	default: () => root_default,
	links: () => links,
	meta: () => meta
});
var links = () => [
	{
		rel: "preconnect",
		href: "https://fonts.googleapis.com"
	},
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous"
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=DotGothic16&family=Shippori+Mincho:wght@600;800&family=Zen+Maru+Gothic:wght@400;700&display=swap"
	}
];
function meta() {
	return [{ title: "Bernice's VS" }, {
		name: "description",
		content: "Bernice's Virtual Shopping App & Closet"
	}];
}
function Layout({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsxs("head", { children: [
			/* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
			/* @__PURE__ */ jsx("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
			}),
			/* @__PURE__ */ jsx("meta", {
				name: "apple-mobile-web-app-capable",
				content: "yes"
			}),
			/* @__PURE__ */ jsx("meta", {
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent"
			}),
			/* @__PURE__ */ jsx("meta", {
				name: "theme-color",
				content: "#ffd6ef"
			}),
			/* @__PURE__ */ jsx(Meta, {}),
			/* @__PURE__ */ jsx(Links, {})
		] }), /* @__PURE__ */ jsxs("body", { children: [
			children,
			/* @__PURE__ */ jsx("div", {
				className: "riso-grain",
				"aria-hidden": true
			}),
			/* @__PURE__ */ jsx(ScrollRestoration, {}),
			/* @__PURE__ */ jsx(Scripts, {})
		] })]
	});
}
/** Shown in the static index.html while the SPA boots. */
var HydrateFallback = UNSAFE_withHydrateFallbackProps(function HydrateFallback() {
	return /* @__PURE__ */ jsxs("main", {
		className: "screen splash",
		children: [/* @__PURE__ */ jsxs("h1", {
			className: "logo",
			children: ["Bernice's ", /* @__PURE__ */ jsx("span", { children: "VS" })]
		}), /* @__PURE__ */ jsx("p", {
			className: "sparkle-loader",
			children: "✦ ✧ ✦"
		})]
	});
});
var root_default = UNSAFE_withComponentProps(function App() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(DebugTuner, {})] });
});
var ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary({ error }) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack;
	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "screen",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "screen-title",
				children: message
			}),
			/* @__PURE__ */ jsx("p", { children: details }),
			/* @__PURE__ */ jsx("a", {
				className: "btn",
				href: "/",
				children: "Home"
			}),
			stack
		]
	});
});
//#endregion
//#region \0virtual:react-router/server-manifest
var server_manifest_default = {
	"entry": {
		"module": "/assets/entry.client-dQ-KENYE.js",
		"imports": [
			"/assets/utils-DrQbUfdI.js",
			"/assets/jsx-runtime-C5GUqp_1.js",
			"/assets/errorBoundaries-_RckwGgn.js"
		],
		"css": []
	},
	"routes": {
		"root": {
			"id": "root",
			"parentId": void 0,
			"path": "",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": true,
			"module": "/assets/root-CCU4uqQ2.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/errorBoundaries-_RckwGgn.js"
			],
			"css": ["/assets/root-DUAD2WvX.css"],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/login": {
			"id": "routes/login",
			"parentId": "root",
			"path": "login",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/login-main-ijjCrwvH.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/login-client-loader-CNIsyvnk.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/login-client-loader-CNIsyvnk.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/art": {
			"id": "routes/art",
			"parentId": "root",
			"path": "art",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/art-tEHPFOlE.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Garment-CoCGtLOl.js",
				"/assets/Avatar-CWCV38AQ.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/nav-DN9tucro.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/app-layout": {
			"id": "routes/app-layout",
			"parentId": "root",
			"path": void 0,
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/app-layout-main-Cy9kXo8r.js",
			"imports": [
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/app-layout-client-loader-DTvl7EZC.js",
				"/assets/utils-DrQbUfdI.js",
				"/assets/store-B3GThTSp.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/app-layout-client-loader-DTvl7EZC.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/home": {
			"id": "routes/home",
			"parentId": "routes/app-layout",
			"path": void 0,
			"index": true,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/home-CfqQgv5d.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Avatar-CWCV38AQ.js",
				"/assets/Sprite-BaCnmENc.js",
				"/assets/Garment-CoCGtLOl.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/world": {
			"id": "routes/world",
			"parentId": "routes/app-layout",
			"path": "world/:worldId",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/world-main-Hm52kzNf.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Sprite-BaCnmENc.js",
				"/assets/ItemCard-BHdnH2X0.js",
				"/assets/world-client-loader-Z3RC_PSP.js",
				"/assets/Garment-CoCGtLOl.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/world-client-loader-Z3RC_PSP.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/closet": {
			"id": "routes/closet",
			"parentId": "routes/app-layout",
			"path": "closet",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/closet-R_Zlpo6K.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/Sprite-BaCnmENc.js",
				"/assets/ItemCard-BHdnH2X0.js",
				"/assets/Garment-CoCGtLOl.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/upcycle": {
			"id": "routes/upcycle",
			"parentId": "routes/app-layout",
			"path": "upcycle/:itemId",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/upcycle-main-CsuuNLyh.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/Sprite-BaCnmENc.js",
				"/assets/ItemCard-BHdnH2X0.js",
				"/assets/upcycle-client-loader-BMMZYa_m.js",
				"/assets/Garment-CoCGtLOl.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/upcycle-client-loader-BMMZYa_m.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/dress-up": {
			"id": "routes/dress-up",
			"parentId": "routes/app-layout",
			"path": "dress-up",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/dress-up-B_FyrvTC.js",
			"imports": [
				"/assets/utils-DrQbUfdI.js",
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Avatar-CWCV38AQ.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/Sprite-BaCnmENc.js",
				"/assets/ItemCard-BHdnH2X0.js",
				"/assets/Garment-CoCGtLOl.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/avatar": {
			"id": "routes/avatar",
			"parentId": "routes/app-layout",
			"path": "avatar",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/avatar-B7rqGNRR.js",
			"imports": [
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Avatar-CWCV38AQ.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/utils-DrQbUfdI.js",
				"/assets/Garment-CoCGtLOl.js",
				"/assets/nav-DN9tucro.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/display": {
			"id": "routes/display",
			"parentId": "routes/app-layout",
			"path": "display",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/display-CGzhUqZv.js",
			"imports": [
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Avatar-CWCV38AQ.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/utils-DrQbUfdI.js",
				"/assets/Garment-CoCGtLOl.js",
				"/assets/nav-DN9tucro.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/settings": {
			"id": "routes/settings",
			"parentId": "routes/app-layout",
			"path": "settings",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/settings-BLzyQ2wO.js",
			"imports": [
				"/assets/jsx-runtime-C5GUqp_1.js",
				"/assets/nav-DN9tucro.js",
				"/assets/store-B3GThTSp.js",
				"/assets/Screen-CemvTR7m.js",
				"/assets/utils-DrQbUfdI.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		}
	},
	"url": "/assets/manifest-ea8e4e29.js",
	"version": "ea8e4e29",
	"sri": void 0
};
//#endregion
//#region \0virtual:react-router/server-build
var route1 = { default: () => null };
var route2 = { default: () => null };
var route3 = { default: () => null };
var route4 = { default: () => null };
var route5 = { default: () => null };
var route6 = { default: () => null };
var route7 = { default: () => null };
var route8 = { default: () => null };
var route9 = { default: () => null };
var route10 = { default: () => null };
var route11 = { default: () => null };
var assetsBuildDirectory = "build\\client";
var basename = "/";
var future = {
	"unstable_enableNodeReadableStream": false,
	"unstable_optimizeDeps": false
};
var ssr = false;
var isSpaMode = true;
var prerender = [];
var routeDiscovery = { "mode": "initial" };
var publicPath = "/";
var entry = { module: entry_server_node_exports };
var routes = {
	"root": {
		id: "root",
		parentId: void 0,
		path: "",
		index: void 0,
		caseSensitive: void 0,
		module: root_exports
	},
	"routes/login": {
		id: "routes/login",
		parentId: "root",
		path: "login",
		index: void 0,
		caseSensitive: void 0,
		module: route1
	},
	"routes/art": {
		id: "routes/art",
		parentId: "root",
		path: "art",
		index: void 0,
		caseSensitive: void 0,
		module: route2
	},
	"routes/app-layout": {
		id: "routes/app-layout",
		parentId: "root",
		path: void 0,
		index: void 0,
		caseSensitive: void 0,
		module: route3
	},
	"routes/home": {
		id: "routes/home",
		parentId: "routes/app-layout",
		path: void 0,
		index: true,
		caseSensitive: void 0,
		module: route4
	},
	"routes/world": {
		id: "routes/world",
		parentId: "routes/app-layout",
		path: "world/:worldId",
		index: void 0,
		caseSensitive: void 0,
		module: route5
	},
	"routes/closet": {
		id: "routes/closet",
		parentId: "routes/app-layout",
		path: "closet",
		index: void 0,
		caseSensitive: void 0,
		module: route6
	},
	"routes/upcycle": {
		id: "routes/upcycle",
		parentId: "routes/app-layout",
		path: "upcycle/:itemId",
		index: void 0,
		caseSensitive: void 0,
		module: route7
	},
	"routes/dress-up": {
		id: "routes/dress-up",
		parentId: "routes/app-layout",
		path: "dress-up",
		index: void 0,
		caseSensitive: void 0,
		module: route8
	},
	"routes/avatar": {
		id: "routes/avatar",
		parentId: "routes/app-layout",
		path: "avatar",
		index: void 0,
		caseSensitive: void 0,
		module: route9
	},
	"routes/display": {
		id: "routes/display",
		parentId: "routes/app-layout",
		path: "display",
		index: void 0,
		caseSensitive: void 0,
		module: route10
	},
	"routes/settings": {
		id: "routes/settings",
		parentId: "routes/app-layout",
		path: "settings",
		index: void 0,
		caseSensitive: void 0,
		module: route11
	}
};
var allowedActionOrigins = false;
//#endregion
export { allowedActionOrigins, server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
