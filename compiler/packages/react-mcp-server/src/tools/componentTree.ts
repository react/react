import puppeteer from 'puppeteer';

export async function parseReactComponentTree(url: string): Promise<string> {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });

    const pages = await browser.pages();

    let localhostPage = null;
    for (const page of pages) {
      const pageUrl = await page.url();

      if (pageUrl.startsWith(url)) {
        localhostPage = page;
        break;
      }
    }

    if (localhostPage) {
      const componentTree = await localhostPage.evaluate(() => {
        return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces
          .get(1)
          .__internal_only_getComponentTree();
      });

      return componentTree;
    } else {
      throw new Error(
        `Could not open the page at ${url}. Is your server running?`,
      );
    }
  } catch (error) {
    throw new Error('Failed extract component tree' + error);
  }
}
