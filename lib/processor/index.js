const _ = require('lodash')
const Category = require('./category')
const Filter = require('./filter')
const Page = require('./page')
const Pagination = require('./pagination')
const Tag = require('./tag')
const Thumb = require('./thumb')
const Toc = require('./toc')
const Summary = require('./summary')
const Jsonify = require('./jsonify')

class Processor {
  constructor(acyort) {
    const { config, markeder } = acyort

    this.categories = []
    this.tags = []
    this.posts = []
    this.pages = []
    this.paginations = {}

    this.config = config
    this.markeder = markeder
    this.category = new Category(config)
    this.filter = new Filter(config)
    this.page = new Page(markeder)
    this.pagination = new Pagination(config)
    this.tag = new Tag(config)
    this.thumb = new Thumb(config)
    this.toc = new Toc(markeder)
    this.summary = new Summary()
    this.jsonify = new Jsonify(config)
  }

  getPosts(posts) {
    this.posts = posts.map((post, i) => {
      const data = this.getPost(post)

      data.prev = i > 0 ? posts[i - 1].id : ''
      data.next = i < posts.length - 1 ? posts[i + 1].id : ''

      return data
    })
  }

  getCategories(post) {
    const index = this.categories.map(c => c.name).indexOf(post.category.name)
    const { id, name, url } = post.category

    if (index > -1) {
      this.categories[index].posts.push(post.id)
    } else {
      this.categories.push({
        id,
        name,
        url,
        posts: [post.id],
      })
    }
  }

  getPaginations() {
    this.paginations.categories = {}
    this.paginations.tags = {}
    this.paginations.page = this.pagination._({
      name: this.config.title,
      posts: this.posts,
    })
    this.paginations.archives = this.pagination._({
      name: this.config.title,
      type: 'archives',
      posts: this.posts,
    })
    this.categories.forEach((category) => {
      const args = Object.assign({ type: 'category' }, _.pick(category, ['name', 'id', 'posts']))
      this.paginations.categories[category.id] = this.pagination._(args)
    })
    this.tags.forEach((tag) => {
      const args = Object.assign({ type: 'tag' }, _.pick(tag, ['name', 'id', 'posts']))
      this.paginations.tags[tag.id] = this.pagination._(args)
    })
  }

  getTags(post) {
    post.tags.forEach((tag) => {
      const index = this.tags.map(t => t.name).indexOf(tag.name)
      const { id, name, url } = tag

      if (index > -1) {
        this.tags[index].posts.push(post.id)
      } else {
        this.tags.push({
          id,
          name,
          url,
          posts: [post.id],
        })
      }
    })
  }

  getPost(post) {
    const data = {
      id: post.id,
      created: post.created_at,
      updated: post.updated_at,
      title: post.title,
      path: `/${this.config.post_dir}/${post.id}.html`,
      url: `/${this.config.post_dir}/${post.id}.html`,
      author: {
        name: post.user.login,
        avatar: post.user.avatar_url,
        url: post.user.html_url,
      },
      raw: this.markeder(post.body, true),
      toc: this.toc._(post.body),
      category: this.category._(post),
      tags: this.tag._(post),
    }
    const { thumb, content } = this.thumb._(post.body)
    const { summary, body } = this.summary._(content)

    data.thumb = thumb
    data.summary = this.markeder(summary)
    data.content = this.markeder(body)

    return data
  }

  getPages(pages) {
    this.pages = pages.map(page => this.page._(page))
  }

  _(issues) {
    const { pages, posts } = this.filter._(issues)

    if (!pages.length && !posts.length) {
      return Promise.reject('No contents')
    }

    this.getPages(pages)
    this.getPosts(posts)

    this.posts.forEach((post) => {
      this.getCategories(post)
      this.getTags(post)
    })

    this.getPaginations()

    const data = _.pick(this, ['posts', 'pages', 'categories', 'tags', 'paginations'])

    return Promise.resolve(this.config.json ? this.jsonify._(data) : data)
  }
}

module.exports = Processor
