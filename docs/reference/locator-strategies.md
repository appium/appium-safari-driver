---
title: Locator Strategies
---

The Safari driver supports the [standard W3C WebDriver locator strategies](https://w3c.github.io/webdriver/#locator-strategies).
The driver does not define any additional locator strategies.

## CSS

|Name|Example|
|---|---|
|`css selector`|`[class=test]`|

This strategy can be used to find elements using multiple criteria: their tag, any of their
attribute(s), pseudo-classes, pseudo-elements, or any combinations.

For more information, [refer to the MDN documentation on CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Selectors).

## Link Text

|Name|Example|
|---|---|
|`link text`|`Click Me`|

This strategy can be used to find link elements (`<a>`) by matching against their text contents.

## Partial Link Text

|Name|Example|
|---|---|
|`partial link text`|`Click`|

This strategy can be used to find link elements (`<a>`) using a partial match against their text contents.

## Tag Name

|Name|Example|
|---|---|
|`tag name`|`div`|

This strategy can be used to find elements using their tag.

## XPath

|Name|Example|
|---|---|
|`xpath`|`//div[@id="hello"]/parent::*`|

This strategy can be used to find elements using a wide variety of criteria. However, it is usually slower than other locator strategies, so it is not recommended as a first choice.

For more information, [refer to the MDN documentation on XPath](https://developer.mozilla.org/en-US/docs/Web/XML/XPath).
