function ifPage(title) {
  return title.indexOf('[') > -1 && title.indexOf(']') > -1
}

class Filter {
  constructor(config) {
    this.config = config
  }

  notInAuthors(author) {
    return this.config.authors.length && this.config.authors.indexOf(author) === -1
  }

  _(issues) {
    const posts = []
    const pages = []

    issues.forEach((issue) => {
      const {
        title,
        user: { login },
      } = issue

      if (this.notInAuthors(login)) {
        return
      }

      if (ifPage(title)) {
        pages.push(issue)
      } else {
        posts.push(issue)
      }
    })

    return { pages, posts }
  }
}

module.exports = Filter
