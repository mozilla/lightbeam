# File Formats in Lightbeam for Firefox

As we have gained experience with Lightbeam for Firefox and built more visualization, talked with folks in the security arena, etc., we've identified more information that would be useful to track than what was included in Format 1.0. This documents the new format, paying special attention to the extensions.

Version 1.2 is an extension of 1.1.
New in Version 1.2: userId, userAgentData.

## Format 1.2

This format has the following structure:

A root object whose keys are `format`, `version`, `connections`, `userId`, and `userAgentData`.

The `format` value is the string "Lightbeam Save File" and is for documentation and identification of JSON files which are Lightbeam for Firefox-specific. 

The `version` value is the string "1.2" and identifies the specific format documented here. A missing `version` key is the same as a `version` value of "0" and should be parsed and interpreted as specified for Format 0 above. 

The `userId` value is a string with the format <identifier>:<timestamp>. User
Ids will never be shared publicly. User IDs are rotated every three months and
necessary to compute metrics such as the number of users who contribute data,
and any metrics or heuristics that rely on knowing the sample size for
statistical significance or confidence intervals. For example, calculating the
mean number of 3rd party cookies received by any Lightbeam user within a given
confidence interval requires knowing the sample size. For more information, see
https://docs.google.com/a/mozilla.com/document/d/1ai2Fhl_DjqdXcIpmmeu9qJmGcaUmKngvFJ66T8yEe4s/edit?pli=1#heading=h.343bsagct5ij.

The `userAgentData` value is an object containing information about the version
of Firefox in use, as well as addons and preferences that may affect the
behavior of Lightbeam.

The `connections` value makes up the bulk of the file. It is an array of connection array objects, where each connection is represented as an array of values in the following order: `[source, target, timestamp, contentType, cookie, sourceVisited, secure, sourcePathDepth, sourceQueryDepth, sourceSub, targetSub, method, status, cacheable]`. Because we will be storing a lot more information over time than the older format, we do not store keys repetitively with each connection, but effectively a 14-tuple corresponding closely to a database row.

The `source` value is a URL containing domain and subdomain information for the requested site, but stripped of protocol, path, query, and fragment. See notes for "target" for changes from 0.0 and 1.0 formats.

The `target` value is a URL containing domain and subdomain information for a resource loaded from a third-party site, and like the source the target is stripped of protocol, path, query, and fragment. Connections which differ only by subdomain are not considered third-party content, which means that if you visit example.com and it loads content from ads.example.com, those connections will not be tracked by Lightbeam for Firefox. This is changed from both 0.0 and 1.0. In 0.0 we did not track subdomain information at all, and in 1.0 we kept subdomains in the "source" and "target" attributes. Now we have reverted to the 0.0 form of stripping subdomains from "source" and "target", but we store the subdomain information in the "sourceSub" and "targetSub" attributes (which will be empty if there is no subdomain).

The `timestamp` is an integer number of milliseconds since the Unix epoch (January 1, 1970) as normally used for Javascript Date objects. The granularity of the timestamp is intentionally reduced when this data is shared, by rounding timestamps down to the last 5 minutes to prevent trackers from comparing our data with theirs to re-associate our data with individual users. Note, this is a change from the earlier (version 0) data format which only stored timestamps relative to the time Lightbeam for Firefox was started, and couldn't be used to restore actual session dates or times.

The `contentType` value is the string reported by the target in the `Content-Type` header, although we MAY also compare with the actual type returned to improve the accuracy of this value. If there is no Content-Type header we WILL attempt to determine the type of the content. If all attempts fail, a default content type of "text/plain" (the standard default content type) will be used, but the value WILL NOT be null.

The `cookie` value is either `true` or `false` representing the existence of one or more `Set-Cookie` headers returned by the target.

The `sourceVisited` value is either `true` or `false`, indicating whether or not the source was loaded by the user in a page or tab. While it is expected that this value will generally be true, it may be false for sources in iframes.

The `secure` value will be `true` for content loaded via the `HTTPS` protocol, `false` for content loaded via `HTTP` protocol. No other protocols are currently tracked by Lightbeam for Firefox as connections.

The `sourcePathDepth` is a metric of how many path elements there were in the source URL before it was sanitized. The URL http://example.com/ has a depth of 0, while the URL http://example.com/blog/post/2012/12/21 has a depth of 5.

The `sourceQueryDepth` is a metric of how many items there were in the query string. This is not a test of unique keys, just simple breaking after the "?" and splitting on "&" and ";". Again, http://example.com/ has a depth of 0, as does http://example.com/?, while http://example.com/?captain=kirk&ship=enterprise, http://example.com/?captain=kirk&captain=picard, and http://example.com/?captain=kirk;ship=enterprise all have a depth of 2.

The `sourceSub` is the remainder of the domain after stripping off the top-level domain (so for "ec2.amazon.com", the source would be "amazon.com" and the source-sub would be "ec2").

The `targetSub` is the same as "sourceSub", but for targets.

The `method` attribute is whether this connection was loaded via GET, POST, PUT, etc.

The `status` attribute is the numeric status of the response (200, 404, 500, etc.) as an integer.

The `cacheable` attribute will be false if the server responded with any of a variety of mechanisms (as headers) for preventing cacheing such as "Cache-control: no-cache", "Pragma: no-cache", "Expires: 0", or "Expires" with a date value in the past relative to the value of the "Date" header.
