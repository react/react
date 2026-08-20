/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */
'use strict';

let React;
let ReactDOMClient;
let ReactDOMServer;
let act;

describe('ReactDOMSVG', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
  });

  it('creates initial namespaced markup', () => {
    const markup = ReactDOMServer.renderToString(
      <svg>
        <image xlinkHref="http://i.imgur.com/w7GCRPb.png" />
      </svg>,
    );
    expect(markup).toContain('xlink:href="http://i.imgur.com/w7GCRPb.png"');
  });

  it('creates elements with SVG namespace inside SVG tag during mount', async () => {
    const node = document.createElement('div');
    let div,
      div2,
      div3,
      foreignObject,
      foreignObject2,
      g,
      image,
      image2,
      image3,
      p,
      svg,
      svg2,
      svg3,
      svg4;
    const root = ReactDOMClient.createRoot(node);
    await act(() => {
      root.render(
        <div>
          <svg ref={el => (svg = el)}>
            <g ref={el => (g = el)} strokeWidth="5">
              <svg ref={el => (svg2 = el)}>
                <foreignObject ref={el => (foreignObject = el)}>
                  <svg ref={el => (svg3 = el)}>
                    <svg ref={el => (svg4 = el)} />
                    <image
                      ref={el => (image = el)}
                      xlinkHref="http://i.imgur.com/w7GCRPb.png"
                    />
                  </svg>
                  <div ref={el => (div = el)} />
                </foreignObject>
              </svg>
              <image
                ref={el => (image2 = el)}
                xlinkHref="http://i.imgur.com/w7GCRPb.png"
              />
              <foreignObject ref={el => (foreignObject2 = el)}>
                <div ref={el => (div2 = el)} />
              </foreignObject>
            </g>
          </svg>
          <p ref={el => (p = el)}>
            <svg>
              <image
                ref={el => (image3 = el)}
                xlinkHref="http://i.imgur.com/w7GCRPb.png"
              />
            </svg>
          </p>
          <div ref={el => (div3 = el)} />
        </div>,
      );
    });
    [svg, svg2, svg3, svg4].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      // SVG tagName is case sensitive.
      expect(el.tagName).toBe('svg');
    });
    expect(g.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(g.tagName).toBe('g');
    expect(g.getAttribute('stroke-width')).toBe('5');
    expect(p.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    // DOM tagName is capitalized by browsers.
    expect(p.tagName).toBe('P');
    [image, image2, image3].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(el.tagName).toBe('image');
      expect(el.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
        'http://i.imgur.com/w7GCRPb.png',
      );
    });
    [foreignObject, foreignObject2].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(el.tagName).toBe('foreignObject');
    });
    [div, div2, div3].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
      expect(el.tagName).toBe('DIV');
    });
  });

  it('creates elements with SVG namespace inside SVG tag during update', async () => {
    let inst,
      div,
      div2,
      foreignObject,
      foreignObject2,
      g,
      image,
      image2,
      svg,
      svg2,
      svg3,
      svg4;

    class App extends React.Component {
      state = {step: 0};

      render() {
        inst = this;
        const {step} = this.state;
        if (step === 0) {
          return null;
        }
        return (
          <g ref={el => (g = el)} strokeWidth="5">
            <svg ref={el => (svg2 = el)}>
              <foreignObject ref={el => (foreignObject = el)}>
                <svg ref={el => (svg3 = el)}>
                  <svg ref={el => (svg4 = el)} />
                  <image
                    ref={el => (image = el)}
                    xlinkHref="http://i.imgur.com/w7GCRPb.png"
                  />
                </svg>
                <div ref={el => (div = el)} />
              </foreignObject>
            </svg>
            <image
              ref={el => (image2 = el)}
              xlinkHref="http://i.imgur.com/w7GCRPb.png"
            />
            <foreignObject ref={el => (foreignObject2 = el)}>
              <div ref={el => (div2 = el)} />
            </foreignObject>
          </g>
        );
      }
    }

    const node = document.createElement('div');
    const root = ReactDOMClient.createRoot(node);
    await act(() => {
      root.render(
        <svg ref={el => (svg = el)}>
          <App />
        </svg>,
      );
    });
    await act(() => {
      inst.setState({step: 1});
    });

    [svg, svg2, svg3, svg4].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      // SVG tagName is case sensitive.
      expect(el.tagName).toBe('svg');
    });
    expect(g.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(g.tagName).toBe('g');
    expect(g.getAttribute('stroke-width')).toBe('5');
    [image, image2].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(el.tagName).toBe('image');
      expect(el.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
        'http://i.imgur.com/w7GCRPb.png',
      );
    });
    [foreignObject, foreignObject2].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(el.tagName).toBe('foreignObject');
    });
    [div, div2].forEach(el => {
      expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
      // DOM tagName is capitalized by browsers.
      expect(el.tagName).toBe('DIV');
    });
  });

  it('can render SVG into a non-React SVG tree', async () => {
    const outerSVGRoot = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    const container = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    );
    outerSVGRoot.appendChild(container);
    let image;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<image ref={el => (image = el)} />);
    });
    expect(image.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(image.tagName).toBe('image');
  });

  it('can render HTML into a foreignObject in non-React SVG tree', async () => {
    const outerSVGRoot = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    const container = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'foreignObject',
    );
    outerSVGRoot.appendChild(container);
    let div;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div ref={el => (div = el)} />);
    });
    expect(div.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(div.tagName).toBe('DIV');
  });
});
