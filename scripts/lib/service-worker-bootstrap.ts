import { CACHE_RESOURCES_MESSAGE } from '@/features/offline/service-worker-cache-message';

export const getServiceWorkerBootstrapScript = () => {
  const messageType = JSON.stringify(CACHE_RESOURCES_MESSAGE);
  return `<script>(function(){if(!("serviceWorker"in navigator))return;var m=${messageType};function u(){var s=new Set(["/","/index.html"]);document.querySelectorAll("script[src],link[href]").forEach(function(n){var v=n.src||n.href;if(v)s.add(v)});if("performance"in window&&performance.getEntriesByType){performance.getEntriesByType("resource").forEach(function(e){if(e.initiatorType==="audio"||e.initiatorType==="video")return;s.add(e.name)})}return Array.from(s)}function c(r){var w=r&&r.active||navigator.serviceWorker.controller;if(w)w.postMessage({type:m,urls:u()})}navigator.serviceWorker.register("/sw.js",{scope:"/"}).then(function(r){return navigator.serviceWorker.ready.then(function(rr){var reg=rr||r;c(reg);window.addEventListener("load",function(){c(reg)})})}).catch(function(){})})();</script>`;
};
