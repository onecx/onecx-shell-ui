import { DocumentTitle } from '@onecx/integration-interface'
import { comparePathPrecedence, matchesPath, RankedPath } from './document-title-path.utils'

interface RegisteredTitle extends RankedPath {
  readonly title: string
}

/**
 * Collects the document titles published by microfrontends and resolves the title for a location.
 * Only the latest title per path string is kept; see {@link matchesPath} for the path syntax and
 * {@link comparePathPrecedence} for which entry wins if several paths match.
 */
export class DocumentTitleRegistry {
  private readonly entries = new Map<string, RegisteredTitle>()
  private sequence = 0

  /**
   * Registers the title for the message path, or removes the entry of exactly that path if the title is undefined
   * or empty.
   */
  apply(message: DocumentTitle): void {
    if (message.title) {
      this.entries.set(message.path, { path: message.path, title: message.title, sequence: ++this.sequence })
    } else {
      this.entries.delete(message.path)
    }
  }

  /**
   * @returns the title of the best matching entry for the pathname, or undefined if no entry matches
   */
  resolve(pathname: string): string | undefined {
    return [...this.entries.values()]
      .filter((entry) => matchesPath(entry.path, pathname))
      .sort(comparePathPrecedence)[0]?.title
  }
}
