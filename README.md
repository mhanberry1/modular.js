# What is modular.js?

Simply put, modular.js is an easier way to develop your website. It allows you to design individual components (modules) on your site without having them interfere with each other. Modules created using modular.js are completely re-usable without the need to copy and paste the same code over and over. Moreover, modular.js is easy to understand and does not require you to learn any new syntax. It is designed to stay out of the way, so feel free to use any framework alongside it -- Although it greatly reduces the need for large frameworks like angular.js. modular.js lets you develop modules as if they are self-contained websites and then augment their functionality when they are used in another document.

# Benefits of using modular.js

### Eliminate Collisions

Every module gets its own shadow DOM to work with, so you don't have to worry about CSS or Javascript variables inside a module interfering with anything else.

### Increase Portability

Once you have created a module, you can re-use it in any other project without any modifications at all.

### Decrease Redundancy

Using modular.js allows you to reduce repeatable code down to a single line, so you only have to focus on unique information.

# How do I use it?

Detailed instructions on how to use modular.js can be found in [index.html](index.html). Deploy it to a server, then open It up in a web browser to see the treasures that lie in wait.

Alternatively, you can find the docs hosted [here](https://berrybuilder.com/modularjs).

_**Note:** modular.js does not function properly without being deployed on a server due browser CORS policies. To avoid having to set up a server, you can use firefox with the following steps:_

* Navigate to the `about:config` page
* Set the value of `privacy.file_unique_origin` to `false`

# Where can I find examples?

[index.html](index.html) is written using modular.js. View the source code to see an example of modular.js in action.
