/**
 * PageSpinner Component
 *
 * The belt, standing in for a whole page: while the app starts, while it
 * checks who is signed in, while a page's content arrives.
 *
 * It exists so that every such wait puts the belt in exactly the same
 * place at exactly the same size. One wait often passes through several
 * of them in a row, and a belt that moved or changed size between them
 * would jump. For a wait inside a page that is already showing, use
 * `BrandSpinner` itself.
 */

import { Center } from "@mantine/core";
import BrandSpinner from "./BrandSpinner";

export interface PageSpinnerProps {
  /** What is loading, read out by screen readers. Defaults to "Loading". */
  label?: string;
}

export default function PageSpinner({ label = "Loading" }: PageSpinnerProps) {
  return (
    <Center mih="60dvh">
      <BrandSpinner size="8rem" label={label} />
    </Center>
  );
}
