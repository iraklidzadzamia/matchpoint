import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { MatchScoreLines } from '../MatchScoreLines';

function renderTexts(winner: 'side1' | 'side2'): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <MatchScoreLines
        side1Name="Irakli & Serena"
        side2Name="Rafael & Venus"
        setScores={[
          [0, 6],
          [6, 3],
          [6, 1],
        ]}
        winner={winner}
      />
    );
  });
  const texts: string[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return void texts.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  walk(instance.toJSON());
  return texts;
}

describe('MatchScoreLines', () => {
  test("keeps each side's set scores on that side's own row", () => {
    const texts = renderTexts('side1');

    // Row order is name, then that side's score for each set in turn
    expect(texts).toEqual([
      'Irakli & Serena',
      '0',
      '6',
      '6',
      'Rafael & Venus',
      '6',
      '3',
      '1',
    ]);
  });

  test('reads the same regardless of which side won', () => {
    // The scores belong to the sides, not to the winner
    expect(renderTexts('side2')).toEqual(renderTexts('side1'));
  });
});
