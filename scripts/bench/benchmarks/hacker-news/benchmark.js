(function () {
  'use strict';

  const e = React.createElement;

  function timeAge(time) {
    const now = new Date().getTime() / 1000;
    const minutes = (now - time) / 60;

    if (minutes < 60) {
      return Math.round(minutes) + ' minutes ago';
    }
    return Math.round(minutes / 60) + ' hours ago';
  }

  function getHostUrl(url) {
    return (url + '')
      .replace('https://', '')
      .replace('http://', '')
      .split('/')[0];
  }

  function HeaderBar() {
    return e(
      'tr',
      {
        style: {
          backgroundColor: '#222',
        },
      },
      e(
        'table',
        {
          style: {
            padding: 4,
          },
          width: '100%',
          cellSpacing: 0,
          cellPadding: 0,
        },
        e(
          'tbody',
          null,
          e(
            'tr',
            null,
            e(
              'td',
              {
                style: {
                  width: 18,
                  paddingRight: 4,
                },
              },
              e(
                'a',
                {
                  href: '#',
                },
                e('img', {
                  src: 'logo.png',
                  width: 16,
                  height: 16,
                  style: {
                    border: '1px solid #00d8ff',
                  },
                })
              )
            ),
            e(
              'td',
              {
                style: {
                  lineHeight: '12pt',
                },
                height: 10,
              },
              e(
                'span',
                {
                  className: 'pagetop',
                },
                e('b', {className: 'hnname'}, 'React HN Benchmark'),
                e('a', {href: '#'}, 'new'),
                ' | ',
                e('a', {href: '#'}, 'comments'),
                ' | ',
                e('a', {href: '#'}, 'show'),
                ' | ',
                e('a', {href: '#'}, 'ask'),
                ' | ',
                e('a', {href: '#'}, 'jobs'),
                ' | ',
                e('a', {href: '#'}, 'submit')
              )
            )
          )
        )
      )
    );
  }

  function Story({story, rank}) {
    return [
      e(
        'tr',
        {
          className: 'athing',
        },
        e(
          'td',
          {
            style: {
              verticalAlign: 'top',
              textAlign: 'right',
            },
            className: 'title',
          },
          e(
            'span',
            {
              className: 'rank',
            },
            `${rank}.`
          )
        ),
        e(
          'td',
          {
            className: 'votelinks',
            style: {
              verticalAlign: 'top',
            },
          },
          e(
            'center',
            null,
            e(
              'a',
              {
                href: '#',
              },
              e('div', {
                className: 'votearrow',
                title: 'upvote',
              })
            )
          )
        ),
        e(
          'td',
          {
            className: 'title',
          },
          e(
            'a',
            {
              href: '#',
              className: 'storylink',
            },
            story.title
          ),
          story.url
            ? e(
                'span',
                {
                  className: 'sitebit comhead',
                },
                ' (',
                e(
                  'a',
                  {
                    href: '#',
                  },
                  getHostUrl(story.url)
                ),
                ')'
              )
            : null
        )
      ),
      e(
        'tr',
        null,
        e('td', {
          colSpan: 2,
        }),
        e(
          'td',
          {
            className: 'subtext',
          },
          e(
            'span',
            {
              className: 'score',
            },
            `${story.score} points`
          ),
          ' by ',
          e(
            'a',
            {
              href: '#',
              className: 'hnuser',
            },
            story.by
          ),
          ' ',
          e(
            'span',
            {
              className: 'age',
            },
            e(
              'a',
              {
                href: '#',
              },
              timeAge(story.time)
            )
          ),
          ' | ',
          e(
            'a',
            {
              href: '#',
            },
            'hide'
          ),
          ' | ',
          e(
            'a',
            {
              href: '#',
            },
            `${story.descendants || 0} comments`
          )
        )
      ),
      e('tr', {
        style: {
          height: 5,
        },
        className: 'spacer',
      }),
    ];
  }

  function StoryList({stories}) {
    return e(
      'tr',
      null,
      e(
        'td',
        null,
        e(
          'table',
          {
            cellPadding: 0,
            cellSpacing: 0,
            classList: 'itemlist',
          },
          e(
            'tbody',
            null,
            stories.map((story, i) =>
              e(Story, {story, rank: ++i, key: story.id})
            )
          )
        )
      )
    );
  }

  function App({stories}) {
    return e(
      'center',
      null,
      e(
        'table',
        {
          id: 'hnmain',
          border: 0,
          cellPadding: 0,
          cellSpacing: 0,
          width: '85%',
          style: {
            'background-color': '#f6f6ef',
          },
        },
        e(
          'tbody',
          null,
          e(HeaderBar, null),
          e('tr', {height: 10}),
          e(StoryList, {
            stories,
          })
        )
      )
    );
  }

  const app = document.getElementById('app');

  window.render = function render() {
    ReactDOM.render(
      React.createElement(App, {
        stories: window.stories,
      }),
      app
    );
  };
})();
