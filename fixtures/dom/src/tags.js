/**
 * Version tags are loaded from the GitHub API. Since the GitHub API is rate-limited
 * we attempt to save and load the tags in sessionStorage when possible. Since its unlikely
 * that versions will change during a single session this should be safe.
 */

const TAGS_CACHE_KEY = '@react-dom-fixtures/tags';

/**
 * Its possible that users will be testing changes frequently
 * in a browser that does not support sessionStorage. If the API does
 * get rate limited this hardcoded fallback will be loaded instead.
 * This way users can still switch between ~some versions while testing.
 * If there's a specific version they need to test that is not here, they
 * can manually load it by editing the URL (`?version={whatever}`)
 */
const fallbackTags = [
  '15.4.2',
  '15.3.2',
  '15.2.1',
  '15.1.0',
  '15.0.2',
  '0.14.8',
  '0.13.0',
].map(version => ({
  name: `v${version}`,
}));

let canUseSessionStorage = true;

try {
  sessionStorage.setItem('foo', '');
} catch (err) {
  canUseSessionStorage = false;
}

/**
 * Attempts to load tags from sessionStorage. In cases where
 * sessionStorage is not available (Safari private browsing) or the
 * tags are cached a fetch request is made to the GitHub API.
 *
 * Returns a promise so that the consuming module can always assume
 * the request is async, even if its loaded from sessionStorage.
 */
export default function getVersionTags() {
  return new Promise(resolve => {
    let cachedTags;
    if (canUseSessionStorage) {
      cachedTags = sessionStorage.getItem(TAGS_CACHE_KEY);
    }
    if (cachedTags) {
      cachedTags = JSON.parse(cachedTags);
      resolve(cachedTags);
    } else {
      fetch('https://api.github.com/repos/react/react/tags?per_page=1000', {
        mode: 'cors',
      })
        .then(res => res.json())
        .then(tags => {
          // A message property indicates an error was sent from the API
          if (tags.message) {
            return resolve(fallbackTags);
          }
          if (canUseSessionStorage) {
            sessionStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags));
          }
          resolve(tags);
        })
        .catch(() => resolve(fallbackTags));
    }
  });
}
