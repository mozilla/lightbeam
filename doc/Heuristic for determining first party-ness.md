Heuristic for determining first party-ness

1. Does the request have a referrer?
2. Is the request made in a tab (window)?
3. Is this request part of resolving the page (not Ajax)?
4. Are we able to resolve a host domain for referrer and tab URIs?
5. Are they the same?
6. Are they *not* 'about:blank'?
7. Ignore requests that come from within the add-on
8. Ignore requests that don't have a valid target or source
9. Ignore requests coming from localhost
10. Ignore requests that are neither http or https protocols (we want to extend this to include websockets and WebRTC connections).
