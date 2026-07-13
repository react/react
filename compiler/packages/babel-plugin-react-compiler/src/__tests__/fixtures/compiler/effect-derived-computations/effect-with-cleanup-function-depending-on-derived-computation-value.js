// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

import {useEffect, useState} from 'react';

function Component(file: File) {
  const [imageUrl, setImageUrl] = useState(null);

  /*
   * Cleaning up the variable or a source of the variable used to setState
   * inside the effect communicates that we always need to clean up something
   * which is a valid use case for useEffect. In which case we want to
   * avoid an throwing
   */
  useEffect(() => {
    const imageUrlPrepared = URL.createObjectURL(file);
    setImageUrl(imageUrlPrepared);
    return () => URL.revokeObjectURL(imageUrlPrepared);
  }, [file]);

  return <Image src={imageUrl} xstyle={styles.imageSizeLimits} />;
}
