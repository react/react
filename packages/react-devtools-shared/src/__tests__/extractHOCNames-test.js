/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {extractHOCNames} from 'react-devtools-shared/src/backend/views/utils';

describe('extractHOCNames', () => {
  it('should return an empty result for an empty display name', () => {
    expect(extractHOCNames('')).toEqual({
      baseComponentName: '',
      hocNames: [],
    });
  });

  it('should not extract anything from an unwrapped component', () => {
    expect(extractHOCNames('Button')).toEqual({
      baseComponentName: 'Button',
      hocNames: [],
    });
  });

  it('should extract a single wrapper', () => {
    expect(extractHOCNames('Memo(Button)')).toEqual({
      baseComponentName: 'Button',
      hocNames: ['Memo'],
    });
  });

  it('should extract every wrapper of a nested display name', () => {
    expect(extractHOCNames('Memo(ForwardRef(Button))')).toEqual({
      baseComponentName: 'Button',
      hocNames: ['Memo', 'ForwardRef'],
    });
  });

  it('should extract wrappers nested more than two levels deep', () => {
    expect(extractHOCNames('Memo(Forget(ForwardRef(Button)))')).toEqual({
      baseComponentName: 'Button',
      hocNames: ['Memo', 'Forget', 'ForwardRef'],
    });
  });

  it('should extract lowercase wrapper names verbatim', () => {
    expect(extractHOCNames('withRouter(Button)')).toEqual({
      baseComponentName: 'Button',
      hocNames: ['withRouter'],
    });
  });

  it('should extract a mix of lowercase and uppercase wrappers', () => {
    expect(extractHOCNames('connect(Memo(Button))')).toEqual({
      baseComponentName: 'Button',
      hocNames: ['connect', 'Memo'],
    });
  });

  it('should not extract from a display name that is not shaped like a wrapper', () => {
    expect(extractHOCNames('Foo (bar)')).toEqual({
      baseComponentName: 'Foo (bar)',
      hocNames: [],
    });
    expect(extractHOCNames('Memo(Button) extra')).toEqual({
      baseComponentName: 'Memo(Button) extra',
      hocNames: [],
    });
  });
});
