# Darvoo Android app (Trusted Web Activity)

The app opens https://darvooventures.com full screen. Menu, prices and orders all come from the live site, so most changes need no app update.

* Package: `com.darvooventures.app`, minimum Android 7.0 (API 24), target API 36
* Generated with Bubblewrap (`generate-twa.js`) from the site's `manifest.webmanifest`
* Site side: `public/.well-known/assetlinks.json` holds the signing key's SHA-256 so Android hides the address bar

## Build

```bash
echo "sdk.dir=/path/to/android-sdk" > local.properties
./gradlew assembleRelease bundleRelease
# sign: zipalign + apksigner for the .apk, jarsigner for the .aab, with the upload keystore
```

The upload keystore and its passwords are **not** in this repo. Keep them in a password manager.
After enrolling in Play App Signing, add Google's app signing SHA-256 (Play Console → Test and release → App integrity) to `assetlinks.json` as a second fingerprint, or the published app will show an address bar.

## Release a new version

Bump `versionCode` and `versionName` in `app/build.gradle` and `twa-manifest.json`, build, sign, upload the `.aab`.
