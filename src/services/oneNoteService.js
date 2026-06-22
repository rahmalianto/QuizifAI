/**
 * OneNote Service — Microsoft Graph API wrapper
 *
 * Provides methods to browse OneNote notebooks, sections, pages,
 * and extract text content from pages.
 */

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export class OneNoteService {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Generic authenticated fetch against the Graph API.
   * Returns parsed JSON.
   */
  async fetchJson(endpoint) {
    const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('MICROSOFT_TOKEN_EXPIRED');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all notebooks for the signed-in user.
   * Returns: [{ id, displayName }]
   */
  async getNotebooks() {
    const data = await this.fetchJson(
      '/me/onenote/notebooks?$select=id,displayName&$orderby=lastModifiedDateTime desc'
    );
    return data.value || [];
  }

  /**
   * Get all sections within a notebook.
   * Returns: [{ id, displayName }]
   */
  async getSections(notebookId) {
    const data = await this.fetchJson(
      `/me/onenote/notebooks/${notebookId}/sections?$select=id,displayName`
    );
    return data.value || [];
  }

  /**
   * Get all pages within a section.
   * Returns: [{ id, title, lastModifiedDateTime }]
   */
  async getPages(sectionId) {
    const data = await this.fetchJson(
      `/me/onenote/sections/${sectionId}/pages?$select=id,title,lastModifiedDateTime&$orderby=order`
    );
    return data.value || [];
  }

  /**
   * Get raw HTML content of a single page.
   * The Graph API returns OneNote page content as HTML.
   */
  async getPageContent(pageId) {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/onenote/pages/${pageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      throw new Error('MICROSOFT_TOKEN_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch page content: ${response.status} ${response.statusText}`
      );
    }

    return response.text();
  }

  /**
   * Fetch and combine text content from multiple pages.
   * Returns a single string with all page texts concatenated.
   */
  async getCombinedPageText(pageIds) {
    const results = await Promise.all(
      pageIds.map(async (id) => {
        const html = await this.getPageContent(id);
        return extractTextFromHtml(html);
      })
    );

    return results
      .filter((text) => text.trim().length > 0)
      .join('\n\n---\n\n');
  }
}

/**
 * Strip HTML tags and return clean text.
 * Uses DOMParser to handle the HTML correctly.
 */
export function extractTextFromHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Remove <style> and <script> tags
  doc.querySelectorAll('style, script').forEach((el) => el.remove());

  // Get text content, preserving line breaks from block elements
  const text = doc.body.innerText || doc.body.textContent || '';

  // Clean up excessive whitespace / blank lines
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => {
      // Remove consecutive blank lines (keep at most one)
      if (line === '' && i > 0 && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .trim();
}
