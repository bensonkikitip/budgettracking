import ExpoModulesCore
import PDFKit

/**
 * PdfExtractorModule
 *
 * Extracts word-level text items from a PDF document using Apple PDFKit.
 * Returns a JSON string of [{page, x, y, text}] objects — one object per word.
 *
 * Word-level (not line-level) extraction is required so that:
 *   • Bank of America's two-column check section (different x per column) resolves correctly.
 *   • Citi's sidebar dollar amounts (high x) can be identified and stripped.
 *
 * Coordinate system:
 *   • PDFKit uses PDF coordinates (origin bottom-left, y increases upward).
 *   • The TypeScript parsers expect y to increase downward (top of page = high y).
 *     We normalise: y_normalised = pageHeight - bounds.minY, which gives the
 *     "distance from top of page", matching typical PDF viewer coordinates.
 *   • x is bounds.minX (left edge of the word's bounding box).
 */
public class PdfExtractorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PdfExtractor")

    AsyncFunction("extractTextItems") { (uri: String) -> String in
      guard let url = URL(string: uri),
            let document = PDFDocument(url: url) else {
        throw NSError(
          domain: "PdfExtractorModule",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Cannot open PDF at \(uri)"]
        )
      }

      var items: [[String: Any]] = []

      for pageIndex in 0..<document.pageCount {
        guard let page = document.page(at: pageIndex) else { continue }
        let pageHeight = page.bounds(for: .mediaBox).height
        let pageNumber = pageIndex + 1

        // selectionsByLine() returns an array of PDFSelection objects, one per line.
        // We split each line into individual words and get a bounding box per word.
        guard let fullSelection = page.selectionForEntirePage() else { continue }
        let lineSelections = fullSelection.selectionsByLine()

        for lineSelection in lineSelections {
          guard let lineString = lineSelection.string else { continue }

          // Split line into whitespace-delimited tokens
          let tokens = lineString.components(separatedBy: .whitespaces).filter { !$0.isEmpty }

          // Scan through the line string to find the range of each token, then
          // ask PDFKit for the character bounds of the first character in that range.
          // This is more reliable than substring searching across ligatures.
          var searchRange = lineString.startIndex..<lineString.endIndex

          for token in tokens {
            guard let tokenRange = lineString.range(of: token, range: searchRange) else { continue }

            // Advance search past this token for next iteration
            searchRange = tokenRange.upperBound..<lineString.endIndex

            // Build a character range for just this token's first character.
            // characterBounds(at: 0) on the character selection gives the bounding
            // box of the whole token in practice (PDFKit merges contiguous characters).
            let nsRange = NSRange(tokenRange, in: lineString)
            guard let charSelection = page.selection(
              for: NSRange(location: nsRange.location, length: nsRange.length)
            ) else { continue }

            let bounds = charSelection.bounds(for: page)
            // Skip items with zero-size bounds (invisible / whitespace artefacts)
            if bounds.width < 0.5 || bounds.height < 0.5 { continue }

            let x = Double(bounds.minX)
            // Normalise y: PDF origin is bottom-left; we want top-left origin
            let y = Double(pageHeight - bounds.minY)

            items.append([
              "page": pageNumber,
              "x": x,
              "y": y,
              "text": token,
            ])
          }
        }
      }

      let data = try JSONSerialization.data(withJSONObject: items, options: [])
      return String(data: data, encoding: .utf8) ?? "[]"
    }
  }
}
