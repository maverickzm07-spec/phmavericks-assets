export interface DriveEmbedInfo {
  type: 'file' | 'folder' | null
  embedUrl: string | null
}

export function getGoogleDriveEmbedInfo(url: string): DriveEmbedInfo {
  if (!url) return { type: null, embedUrl: null }
  try {
    // Carpeta: drive.google.com/drive/folders/FOLDER_ID (soporta /u/0/, /u/1/, etc.)
    const folder = url.match(/drive\.google\.com\/drive(?:\/u\/\d+)?\/folders\/([a-zA-Z0-9_-]+)/)
    if (folder) {
      return {
        type: 'folder',
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`,
      }
    }

    // Archivo: drive.google.com/file/d/FILE_ID/...
    const file = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (file) {
      return {
        type: 'file',
        embedUrl: `https://drive.google.com/file/d/${file[1]}/preview`,
      }
    }

    // Google Docs / Sheets / Slides
    const docs = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/)
    if (docs) {
      return {
        type: 'file',
        embedUrl: `https://docs.google.com/${docs[1]}/d/${docs[2]}/preview`,
      }
    }

    // drive.google.com/open?id=FILE_ID
    const openId = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    if (openId) {
      return {
        type: 'file',
        embedUrl: `https://drive.google.com/file/d/${openId[1]}/preview`,
      }
    }

    return { type: null, embedUrl: null }
  } catch {
    return { type: null, embedUrl: null }
  }
}
