/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function RegistrationMarks() {
  return (
    <>
      {/* Top Left */}
      <div className="crop-mark top-3 left-3 select-none" aria-hidden="true">
        +
      </div>
      {/* Top Right */}
      <div className="crop-mark top-3 right-3 select-none" aria-hidden="true">
        +
      </div>
      {/* Bottom Left */}
      <div className="crop-mark bottom-3 left-3 select-none" aria-hidden="true">
        +
      </div>
      {/* Bottom Right */}
      <div className="crop-mark bottom-3 right-3 select-none" aria-hidden="true">
        +
      </div>
    </>
  );
}
