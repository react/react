import React from 'react';
import {useState} from 'react';

const CONST = true;

let NON_REASSIGNED_LET = true;

let REASSIGNED_LET = false;
REASSIGNED_LET = true;

function reassignedFunction() {}
reassignedFunction = true;

function nonReassignedFunction() {}

class ReassignedClass {}
ReassignedClass = true;

class NonReassignedClass {}

function Component() {
  const [state] = useState(null);
  return [
    React,
    state,
    CONST,
    NON_REASSIGNED_LET,
    REASSIGNED_LET,
    reassignedFunction,
    nonReassignedFunction,
    ReassignedClass,
    NonReassignedClass,
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
