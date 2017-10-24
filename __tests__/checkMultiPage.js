import {readFileSync} from 'fs';
import {join} from 'path';

import {checkMultiPage} from '../src';

const files = [
    {name: 'grey8.tif', pages: 1},
    {name: 'grey16.tif', pages: 1},
    {name: 'color8.tif', pages: 1},
    {name: 'color16.tif', pages: 1},
    {name: 'grey8-multi.tif', pages: 2},
    {name: 'grey16-multi.tif', pages: 2},
    {name: 'color8-multi.tif', pages: 2},
    {name: 'color16-multi.tif', pages: 2},
];
// const files = ['color8c.tif'];//'grey8.tif', 'grey16.tif', 'color8.tif', 'color16.tif'];
const contents = files.map(file => readFileSync(join(__dirname, 'img', file.name)));

describe('TIFF checkMultiPage', () =>{
    it('should checkMultiPage', () =>{
        for (var i = 0; i < contents.length; i++) {
            const result = checkMultiPage(contents[i]);
            expect(result).toBe(files[i].pages > 1);
        }
    });
});
