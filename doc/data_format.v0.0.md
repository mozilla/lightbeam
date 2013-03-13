# File Formats in Collusion

Collusion had an undocument existing file format for saved files, but has migrated to a new format that captures multiple site visits and changes over time better. This is the original format, for posterity.

## Format 0

This format takes the following structure:

A root object whose keys are third-party URLs (potential trackers). These URLs are reduced to the simple domain, with all protocol, subdomain, query, path, and fragment components stripped off. Each key's value is an object containing the keys "referrers" and (optionally) visited. If a site has been the target of a user's browsing (i.e., the user intentionally loaded the site), it should be marked "visited": true. Lack of a "visited" key is the same as "visited": false. The value of the "referrers" key is an object whose keys are the referrers which included this potential tracker in their page(s). The "referrer" keys are also domain names, URLs stripped of all other information.

Each referrer value is an object containing the keys `timestamp`, `datatypes`, [optional] `cookie` and [optional] `noncoookie`. Some save files also include the key `uploaded` which was left in by mistake from an earlier experiment and is not used. 

The `timestamp` value is an integer representation of time, in milliseconds since Collusion was last started or cleared (yes, this makes the timestamp only useful for basic ordering, and when data is reloaded from a save file or browser restart, we even lose ordering). 

The `datatypes` value is a list of zero or more datatypes, which may contain null values. The list is the collection of unique values which have been reported by the site in the `Content-Type` response header, i.e., a list of all the types of content that have been loaded *by that referrer* from the potential tracker. 

The `cookie` value is a boolean flag set if any request by that referrer to the potential tracker contained a cookie, with an absent "cookie" key being the same as a `cookie` value of `false`. 

The `noncookie` value is a boolean flag set if any request by that referrer to the potential tracker does *not* contain a cookie, with an absent `noncookie` key being the same as a `noncookie` value of `false`. It is possible for a referrer to have both `cookie` and `noncookie` flags set if different requests to the potential tracker had different headers (some with cookies, some without).

Example:

``` json
{
    "google.com": {
        "referrers": {
            "google.ca": {
                "timestamp": 35974,
                "datatypes": [
                    "image/jpeg",
                    "image/png",
                    "image/jpeg;charset=UTF-8"
                ],
                "uploaded": false,
                "cookie": true
            }
        }
    }
}
```

