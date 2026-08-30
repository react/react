use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BinaryOperator {
    #[serde(rename = "+")]
    Add,
    #[serde(rename = "-")]
    Sub,
    #[serde(rename = "*")]
    Mul,
    #[serde(rename = "/")]
    Div,
    #[serde(rename = "%")]
    Rem,
    #[serde(rename = "**")]
    Exp,
    #[serde(rename = "==")]
    Eq,
    #[serde(rename = "===")]
    StrictEq,
    #[serde(rename = "!=")]
    Neq,
    #[serde(rename = "!==")]
    StrictNeq,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = "<=")]
    Lte,
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = ">=")]
    Gte,
    #[serde(rename = "<<")]
    Shl,
    #[serde(rename = ">>")]
    Shr,
    #[serde(rename = ">>>")]
    UShr,
    #[serde(rename = "|")]
    BitOr,
    #[serde(rename = "^")]
    BitXor,
    #[serde(rename = "&")]
    BitAnd,
    #[serde(rename = "in")]
    In,
    #[serde(rename = "instanceof")]
    Instanceof,
    #[serde(rename = "|>")]
    Pipeline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogicalOperator {
    #[serde(rename = "||")]
    Or,
    #[serde(rename = "&&")]
    And,
    #[serde(rename = "??")]
    NullishCoalescing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UnaryOperator {
    #[serde(rename = "-")]
    Neg,
    #[serde(rename = "+")]
    Plus,
    #[serde(rename = "!")]
    Not,
    #[serde(rename = "~")]
    BitNot,
    #[serde(rename = "typeof")]
    TypeOf,
    #[serde(rename = "void")]
    Void,
    #[serde(rename = "delete")]
    Delete,
    #[serde(rename = "throw")]
    Throw,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpdateOperator {
    #[serde(rename = "++")]
    Increment,
    #[serde(rename = "--")]
    Decrement,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AssignmentOperator {
    #[serde(rename = "=")]
    Assign,
    #[serde(rename = "+=")]
    AddAssign,
    #[serde(rename = "-=")]
    SubAssign,
    #[serde(rename = "*=")]
    MulAssign,
    #[serde(rename = "/=")]
    DivAssign,
    #[serde(rename = "%=")]
    RemAssign,
    #[serde(rename = "**=")]
    ExpAssign,
    #[serde(rename = "<<=")]
    ShlAssign,
    #[serde(rename = ">>=")]
    ShrAssign,
    #[serde(rename = ">>>=")]
    UShrAssign,
    #[serde(rename = "|=")]
    BitOrAssign,
    #[serde(rename = "^=")]
    BitXorAssign,
    #[serde(rename = "&=")]
    BitAndAssign,
    #[serde(rename = "||=")]
    OrAssign,
    #[serde(rename = "&&=")]
    AndAssign,
    #[serde(rename = "??=")]
    NullishAssign,
}
