# 源码分析

## webpack 本质

webpack 可以理解为基于事件流的编程范例，一系列的插件运行

Webpack 的运行流程是一个串行的过程，从启动到结束会依次执行以下流程：

- 初始化参数：从配置文件和 Shell 语句中读取与合并参数，得出最终的参数；(webpack-cli 处理)
- 开始编译：用上一步得到的参数初始化 Compiler 对象，加载所有配置的插件，执行对象的 run 方法开始执行编译；（webpack/lib/webpack.js）
- 编译模块：从入口文件出发，调用所有配置的 Loader 对模块进行翻译，再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理；
- 完成模块编译：在经过第 3 步使用 Loader 编译完所有模块后，得到了每个模块被翻译后的最终内容以及它们之间的依赖关系；
- 输出资源：根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk，再把每个 Chunk 转换成一个单独的文件加入到输出列表，这步是可以修改输出内容的最后机会；
- 输出完成：在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统。

## bin/webpack.js

`webpack`在命令行中运行该命令，npm 会让命令行工具进入`node_modules/.bin`目录中查找 webpack.js 文件，并执行该文件。实际上文件的入口`node_modules/webpack/bin/webpack.js`

- 判断 webpack-cli 和 webpack-common 是否有安装
- 一个都没有安装，指导安装
- 有一个安装则执行
- 两个都安装，指导删除之中一个

```js
// node_modules/webpack/bin/webpack.js

#!/usr/bin/env node

// @ts-ignore
process.exitCode = 0;

/**
 * @param {string} command process to run
 * @param {string[]} args commandline arguments
 * @returns {Promise<void>} promise
 */
const runCommand = (command, args) => {
	const cp = require("child_process");
	return new Promise((resolve, reject) => {
		const executedCommand = cp.spawn(command, args, {
			stdio: "inherit",
			shell: true
		});

		executedCommand.on("error", error => {
			reject(error);
		});

		executedCommand.on("exit", code => {
			if (code === 0) {
				resolve();
			} else {
				reject();
			}
		});
	});
};

/**
 * @param {string} packageName name of the package
 * @returns {boolean} is the package installed?
 */
const isInstalled = packageName => {
	try {
		require.resolve(packageName);

		return true;
	} catch (err) {
		return false;
	}
};

/**
 * @typedef {Object} CliOption
 * @property {string} name display name
 * @property {string} package npm package name
 * @property {string} binName name of the executable file
 * @property {string} alias shortcut for choice
 * @property {boolean} installed currently installed?
 * @property {boolean} recommended is recommended
 * @property {string} url homepage
 * @property {string} description description
 */

/** @type {CliOption[]} */
const CLIs = [
	{
		name: "webpack-cli",
		package: "webpack-cli",
		binName: "webpack-cli",
		alias: "cli",
		installed: isInstalled("webpack-cli"),
		recommended: true,
		url: "https://github.com/webpack/webpack-cli",
		description: "The original webpack full-featured CLI."
	},
	{
		name: "webpack-command",
		package: "webpack-command",
		binName: "webpack-command",
		alias: "command",
		installed: isInstalled("webpack-command"),
		recommended: false,
		url: "https://github.com/webpack-contrib/webpack-command",
		description: "A lightweight, opinionated webpack CLI."
	}
];
// 查找当前安装的webpack-cli和webpack-command,如果有返回该cli
const installedClis = CLIs.filter(cli => cli.installed);
// 判断安装的cli的数量
// 1.数量为0，则提示安装
// 2.数量为1，则调用该cli
// 3.数量为2，则提示卸载其中的一个
if (installedClis.length === 0) {
	const path = require("path");
	const fs = require("fs");
	const readLine = require("readline");

	let notify =
		"One CLI for webpack must be installed. These are recommended choices, delivered as separate packages:";

	for (const item of CLIs) {
		if (item.recommended) {
			notify += `\n - ${item.name} (${item.url})\n   ${item.description}`;
		}
	}

	console.error(notify);

	const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

	const packageManager = isYarn ? "yarn" : "npm";
	const installOptions = [isYarn ? "add" : "install", "-D"];

	console.error(
		`We will use "${packageManager}" to install the CLI via "${packageManager} ${installOptions.join(
			" "
		)}".`
	);

	const question = `Do you want to install 'webpack-cli' (yes/no): `;

	const questionInterface = readLine.createInterface({
		input: process.stdin,
		output: process.stderr
	});
	questionInterface.question(question, answer => {
		questionInterface.close();

		const normalizedAnswer = answer.toLowerCase().startsWith("y");

		if (!normalizedAnswer) {
			console.error(
				"You need to install 'webpack-cli' to use webpack via CLI.\n" +
					"You can also install the CLI manually."
			);
			process.exitCode = 1;

			return;
		}

		const packageName = "webpack-cli";

		console.log(
			`Installing '${packageName}' (running '${packageManager} ${installOptions.join(
				" "
			)} ${packageName}')...`
		);

		runCommand(packageManager, installOptions.concat(packageName))
			.then(() => {
				require(packageName); //eslint-disable-line
			})
			.catch(error => {
				console.error(error);
				process.exitCode = 1;
			});
	});
} else if (installedClis.length === 1) {
	const path = require("path");
	const pkgPath = require.resolve(`${installedClis[0].package}/package.json`);
	// eslint-disable-next-line node/no-missing-require
	const pkg = require(pkgPath);
	// eslint-disable-next-line node/no-missing-require
	require(path.resolve(
		path.dirname(pkgPath),
		pkg.bin[installedClis[0].binName]
	));
} else {
	console.warn(
		`You have installed ${installedClis
			.map(item => item.name)
			.join(
				" and "
			)} together. To work with the "webpack" command you need only one CLI package, please remove one of them or use them directly via their binary.`
	);

	// @ts-ignore
	process.exitCode = 1;
}

```

## webpack-cli.js

在 webpack.js 中执行了`webpack-cli/bin/cli.js`文件

- 处理不需要编译的命令，NON_COMPILATION_CMD 分析不需要编译的命令
  1. 如果命令在 NON_COMPILATION_ARGS 中，则不进行编译，执行文件`webpack-cli/bin/utils/prompt-command.js`
  2. 在 prompt-command 文件中查询是否安装该命名的包，没有则去安装提示，有则执行该包

```
const NON_COMPILATION_ARGS = [
			"init",				创建一份webpack配置文件
			"migrate", 			进行webpack版本迁移
			"serve", 				运行webpack-serve
			"generate-loader", 		生成webpack-loader代码
			"generate-plugin", 		生成webpack-plugin代码
			"info"				返回与本地环境相关的一些信息
		];
```

- 调用命令行工具包 yargs 动态生成 help 帮助参数，提供命令和分组参数

  参数的分组（config/config-args.js），将命令划分为 9 类

  1. Config options:配置相关参数(文件名称、运行环境等) 2. Basic options:基础参数(entry 设置、debug 模式设置、watch 监听设置、devtool 设置) 3. Module options:模块参数,给 loader 设置扩展 4. Output options:输出参数(输出路径、输出文件名称) 5. Advanced options:高级用法(记录设置、缓存设置、监听频率、bail 等) 6. Resolving options:解析参数(alias 和解析的文件后缀设置) 7. Optimizing options:优化参数 8. Stats options:统计参数 9. options:通用参数(帮助命令、版本信息等)

- 对配置文件和命令行参数进行转化最终生成配置选项参数 options
- 根据配置参数实例化 webpack 对象，然后执行构建流程

```js
// node_modules/webpack-cli/bin/cli.js

#!/usr/bin/env node

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

const { NON_COMPILATION_ARGS } = require("./utils/constants");
(function () {
  // wrap in IIFE to be able to use return
  // 用import-local包判断当前webpack-cli是本地安装还是全局安装，如果是全局安装则中断执行
  const importLocal = require('import-local')
  // Prefer the local installation of webpack-cli
  if (importLocal(__filename)) {
    return
  }
  // v8代码缓存功能，加速实例化
  require('v8-compile-cache')
  // 错误类
  const ErrorHelpers = require('./utils/errorHelpers')
  // NON_COMPILATION_ARGS存储不需要编译的参数
  // 根据上面的生成NON_COMPILATION_CMD存储命令中有不需要的编译参数
  const NON_COMPILATION_CMD = process.argv.find(arg => {
    if (arg === 'serve') {
      global.process.argv = global.process.argv.filter(a => a !== 'serve')
      process.argv = global.process.argv
    }
    return NON_COMPILATION_ARGS.find(a => a === arg)
  })
  // 如果NON_COMPILATION_CMD有，则不进行编译而执行这些命令
  if (NON_COMPILATION_CMD) {
    return require('./utils/prompt-command')(
      NON_COMPILATION_CMD,
      ...process.argv
    )
  }
  // 调用命令行工具包yargs动态生成help帮助参数，提供命令和分组参数
  const yargs = require('yargs').usage(`webpack-cli ${
    require('../package.json').version
  }

Usage: webpack-cli [options]
       webpack-cli [options] --entry <entry> --output <output>
       webpack-cli [options] <entries...> --output <output>
       webpack-cli <command> [options]

For more information, see https://webpack.js.org/api/cli/.`)
  // 对yargs进行配置
  require('./config/config-yargs')(yargs)

  // yargs will terminate the process early when the user uses help or version.
  // This causes large help outputs to be cut short (https://github.com/nodejs/node/wiki/API-changes-between-v0.10-and-v4#process).
  // To prevent this we use the yargs.parse API and exit the process normally
  // 使用yargs解析并执行命令行参数
  yargs.parse(process.argv.slice(2), (err, argv, output) => {
    Error.stackTraceLimit = 30

    // arguments validation failed
    // 如果解析错误并且有输出内容，则输出错误内容并推出执行
    if (err && output) {
      console.error(output)
      process.exitCode = 1
      return
    }

    // help or version info
    // 如果有输出内容，则输出他们并返回
    if (output) {
      console.log(output)
      return
    }

    if (argv.verbose) {
      argv['display'] = 'verbose'
    }

    let options
    try {
      // 对命令行参数和配置文件进行转化、合并和合法性检测并生成最终的配置选项参数
      options = require('./utils/convert-argv')(argv)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        const moduleName = err.message.split("'")[1]
        let instructions = ''
        let errorMessage = ''

        if (moduleName === 'webpack') {
          errorMessage = `\n${moduleName} not installed`
          instructions = `Install webpack to start bundling: \u001b[32m\n  $ npm install --save-dev ${moduleName}\n`

          if (
            process.env.npm_execpath !== undefined &&
            process.env.npm_execpath.includes('yarn')
          ) {
            instructions = `Install webpack to start bundling: \u001b[32m\n $ yarn add ${moduleName} --dev\n`
          }
          Error.stackTraceLimit = 1
          console.error(`${errorMessage}\n\n${instructions}`)
          process.exitCode = 1
          return
        }
      }

      if (err.name !== 'ValidationError') {
        throw err
      }

      const stack = ErrorHelpers.cleanUpWebpackOptions(err.stack, err.message)
      const message = err.message + '\n' + stack

      if (argv.color) {
        console.error(`\u001b[1m\u001b[31m${message}\u001b[39m\u001b[22m`)
      } else {
        console.error(message)
      }

      process.exitCode = 1
      return
    }

    /**
     * When --silent flag is present, an object with a no-op write method is
     * used in place of process.stout
     */
    const stdout = argv.silent ? { write: () => {} } : process.stdout

    function ifArg (name, fn, init) {
      if (Array.isArray(argv[name])) {
        if (init) init()
        argv[name].forEach(fn)
      } else if (typeof argv[name] !== 'undefined') {
        if (init) init()
        fn(argv[name], -1)
      }
    }

    function processOptions (options) {
      // process Promise
      if (typeof options.then === 'function') {
        options.then(processOptions).catch(function (err) {
          console.error(err.stack || err)
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        })
        return
      }
      // 获取选项数组的第一项
      const firstOptions = [].concat(options)[0]
      // 引入webpack包的配置项预处理函数
      const statsPresetToOptions = require('webpack').Stats.presetToOptions
      // 定义outputOptions为options的stats字段,构建的统计信息
      let outputOptions = options.stats
      // 对outputOptions进行处理返回
      if (
        typeof outputOptions === 'boolean' ||
        typeof outputOptions === 'string'
      ) {
        outputOptions = statsPresetToOptions(outputOptions)
      } else if (!outputOptions) {
        outputOptions = {}
      }

      ifArg('display', function (preset) {
        outputOptions = statsPresetToOptions(preset)
      })

      outputOptions = Object.create(outputOptions)
      if (Array.isArray(options) && !outputOptions.children) {
        outputOptions.children = options.map(o => o.stats)
      }
      if (typeof outputOptions.context === 'undefined') { outputOptions.context = firstOptions.context }

      ifArg('env', function (value) {
        if (outputOptions.env) {
          outputOptions._env = value
        }
      })

      ifArg('json', function (bool) {
        if (bool) {
          outputOptions.json = bool
          outputOptions.modules = bool
        }
      })

      if (typeof outputOptions.colors === 'undefined') { outputOptions.colors = require('supports-color').stdout }

      ifArg('sort-modules-by', function (value) {
        outputOptions.modulesSort = value
      })

      ifArg('sort-chunks-by', function (value) {
        outputOptions.chunksSort = value
      })

      ifArg('sort-assets-by', function (value) {
        outputOptions.assetsSort = value
      })

      ifArg('display-exclude', function (value) {
        outputOptions.exclude = value
      })

      if (!outputOptions.json) {
        if (typeof outputOptions.cached === 'undefined') { outputOptions.cached = false }
        if (typeof outputOptions.cachedAssets === 'undefined') { outputOptions.cachedAssets = false }

        ifArg('display-chunks', function (bool) {
          if (bool) {
            outputOptions.modules = false
            outputOptions.chunks = true
            outputOptions.chunkModules = true
          }
        })

        ifArg('display-entrypoints', function (bool) {
          outputOptions.entrypoints = bool
        })

        ifArg('display-reasons', function (bool) {
          if (bool) outputOptions.reasons = true
        })

        ifArg('display-depth', function (bool) {
          if (bool) outputOptions.depth = true
        })

        ifArg('display-used-exports', function (bool) {
          if (bool) outputOptions.usedExports = true
        })

        ifArg('display-provided-exports', function (bool) {
          if (bool) outputOptions.providedExports = true
        })

        ifArg('display-optimization-bailout', function (bool) {
          if (bool) outputOptions.optimizationBailout = bool
        })

        ifArg('display-error-details', function (bool) {
          if (bool) outputOptions.errorDetails = true
        })

        ifArg('display-origins', function (bool) {
          if (bool) outputOptions.chunkOrigins = true
        })

        ifArg('display-max-modules', function (value) {
          outputOptions.maxModules = +value
        })

        ifArg('display-cached', function (bool) {
          if (bool) outputOptions.cached = true
        })

        ifArg('display-cached-assets', function (bool) {
          if (bool) outputOptions.cachedAssets = true
        })

        if (!outputOptions.exclude) {
          outputOptions.exclude = [
            'node_modules',
            'bower_components',
            'components'
          ]
        }

        if (argv['display-modules']) {
          outputOptions.maxModules = Infinity
          outputOptions.exclude = undefined
          outputOptions.modules = true
        }
      }

      ifArg('hide-modules', function (bool) {
        if (bool) {
          outputOptions.modules = false
          outputOptions.chunkModules = false
        }
      })

      ifArg('info-verbosity', function (value) {
        outputOptions.infoVerbosity = value
      })

      ifArg('build-delimiter', function (value) {
        outputOptions.buildDelimiter = value
      })

      const webpack = require('webpack')

      let lastHash = null
      let compiler
      // 根据配置选项options使用webpack构建编译
      try {
        compiler = webpack(options)
      } catch (err) {
        if (err.name === 'WebpackOptionsValidationError') {
          if (argv.color) {
            console.error(
              `\u001b[1m\u001b[31m${err.message}\u001b[39m\u001b[22m`
            )
          } else console.error(err.message)
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        }

        throw err
      }
      // 如果传入了progress参数，则引用webpack的ProgressPlugin插件进行编译
      if (argv.progress) {
        const ProgressPlugin = require('webpack').ProgressPlugin
        new ProgressPlugin({
          profile: argv.profile
        }).apply(compiler)
      }
      // 如果设置了全部输出，则根据参数是否包含w(是否为监听模式)参数决定使用哪个方法来显示编译信息
      if (outputOptions.infoVerbosity === 'verbose') {
        if (argv.w) {
          compiler.hooks.watchRun.tap('WebpackInfo', compilation => {
            const compilationName = compilation.name ? compilation.name : ''
            console.error('\nCompilation ' + compilationName + ' starting…\n')
          })
        } else {
          compiler.hooks.beforeRun.tap('WebpackInfo', compilation => {
            const compilationName = compilation.name ? compilation.name : ''
            console.error('\nCompilation ' + compilationName + ' starting…\n')
          })
        }
        compiler.hooks.done.tap('WebpackInfo', compilation => {
          const compilationName = compilation.name ? compilation.name : ''
          console.error('\nCompilation ' + compilationName + ' finished\n')
        })
      }
      // 编译回调
      function compilerCallback (err, stats) {
        // 如果不处于监听模式或者编译出错，则净化文件系统，即不在缓存文件
        if (!options.watch || err) {
          // Do not keep cache anymore
          compiler.purgeInputFileSystem()
        }
        // 如果错误，则输出错误信息并退出执行
        if (err) {
          lastHash = null
          console.error(err.stack || err)
          if (err.details) console.error(err.details)
          process.exitCode = 1
          return
        }
        // 如果outputOptions有json属性，则将选项序列化为字符串作为标准输出
        if (outputOptions.json) {
          stdout.write(
            JSON.stringify(stats.toJson(outputOptions), null, 2) + '\n'
          )
        } else if (stats.hash !== lastHash) {
          lastHash = stats.hash
          if (stats.compilation && stats.compilation.errors.length !== 0) {
            const errors = stats.compilation.errors
            if (errors[0].name === 'EntryModuleNotFoundError') {
              console.error(
                '\n\u001b[1m\u001b[31mInsufficient number of arguments or no entry found.'
              )
              console.error(
                "\u001b[1m\u001b[31mAlternatively, run 'webpack(-cli) --help' for usage info.\u001b[39m\u001b[22m\n"
              )
            }
          }
          const statsString = stats.toString(outputOptions)
          const delimiter = outputOptions.buildDelimiter
            ? `${outputOptions.buildDelimiter}\n`
            : ''
          if (statsString) stdout.write(`${statsString}\n${delimiter}`)
        }
        if (!options.watch && stats.hasErrors()) {
          process.exitCode = 2
        }
      }
      // 如果处于监听模式，则获取监听模式的配置项，并在标准输入为end时结束执行
      if (firstOptions.watch || options.watch) {
        // 获取监听配置项
        const watchOptions =
          firstOptions.watchOptions ||
          options.watchOptions ||
          firstOptions.watch ||
          options.watch ||
          {}
        if (watchOptions.stdin) {
          process.stdin.on('end', function (_) {
            process.exit() // eslint-disable-line
          })
          process.stdin.resume()
        }
        // 以监听模式进行编译
        compiler.watch(watchOptions, compilerCallback)
        // 如果显示模式为不输出，则输出错误提示:webpack正在监听文件
        if (outputOptions.infoVerbosity !== 'none') { console.error('\nwebpack is watching the files…\n') }
      } else {
        // 运行编译模块，并在编译关闭后执行编译回调
        compiler.run((err, stats) => {
          if (compiler.close) {
            compiler.close(err2 => {
              compilerCallback(err || err2, stats)
            })
          } else {
            compilerCallback(err, stats)
          }
        })
      }
    }
    processOptions(options)
  })
})()
```

## lib/webpack.js

- 对参数进行校验和规范化处理
- 实例化 compiler 对象并且初始化插件，在环境准备好和安装完成以后执行响应钩子
- 如果是监听模式，返回 compiler.watch，否则返回 compiler

```js
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict'

const Compiler = require('./Compiler')
const MultiCompiler = require('./MultiCompiler')
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const WebpackOptionsApply = require('./WebpackOptionsApply')
const WebpackOptionsDefaulter = require('./WebpackOptionsDefaulter')
const validateSchema = require('./validateSchema')
const WebpackOptionsValidationError = require('./WebpackOptionsValidationError')
const webpackOptionsSchema = require('../schemas/WebpackOptions.json')
const RemovedPluginError = require('./RemovedPluginError')
const version = require('../package.json').version

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */

/**
 * @param {WebpackOptions} options options object
 * @param {function(Error=, Stats=): void=} callback callback
 * @returns {Compiler | MultiCompiler} the compiler object
 */
const webpack = (options, callback) => {
  // 验证配置选项格式
  // webpackOptionsSchema是一个json格式的描述文件，它描述了webpack可接收的所有配置项及其格式
  // options 用户定义的webpack.config.*.js中导出的所有配置项
  // validateSchema使用ajv包，根据webpackOptionsSchema中定义的数据类型和描述来校验options中的各种配置项，最后返回一个错误对象，其中包含所有错误的配置项及说明
  const webpackOptionsValidationErrors = validateSchema(
    webpackOptionsSchema,
    options
  )
  // 如果存在配置项错误，则抛出所有错误
  if (webpackOptionsValidationErrors.length) {
    throw new WebpackOptionsValidationError(webpackOptionsValidationErrors)
  }
  let compiler
  // 判断配置项是否为数组
  // 如果是数组使用MultiCompiler模块进行编译
  // 如果是对象使用Compiler模块进行编译
  // 如果都不是抛出错误
  if (Array.isArray(options)) {
    compiler = new MultiCompiler(
      Array.from(options).map(options => webpack(options))
    )
  } else if (typeof options === 'object') {
    // 使用默认配置项处理输入配置项
    options = new WebpackOptionsDefaulter().process(options)
    // 实例化compiler对象，传入当前执行node命令的目录路径
    compiler = new Compiler(options.context)
    compiler.options = options
    // 使用NodeEnvironmentPlugin类给compiler添加文件输入输出的能力
    // 在beforeRun钩子中清除缓存文件
    new NodeEnvironmentPlugin({
      infrastructureLogging: options.infrastructureLogging
    }).apply(compiler)
    // 如果配置项有插件配置并且是数组，则遍历插件数组
    // 如果插件是一个函数，则使用compiler来调用，并且将compiler作为参数传入
    // 否则使用插件中的apply方法调用，将compiler作为参数传入
    if (options.plugins && Array.isArray(options.plugins)) {
      for (const plugin of options.plugins) {
        if (typeof plugin === 'function') {
          plugin.call(compiler, compiler)
        } else {
          plugin.apply(compiler)
        }
      }
    }
    // 触发environment同步钩子
    // 在environment准备好之后，执行插件
    compiler.hooks.environment.call()
    // 触发afterEnvironment同步钩子
    // 在environment安装完成之后，执行插件
    compiler.hooks.afterEnvironment.call()
    // 使用WebpackOptionsApply类处理选项，返回处理过的选项对象并将所有的options参数转化为webpack内部插件
    // 执行entryOption和afterPlugins钩子
    compiler.options = new WebpackOptionsApply().process(options, compiler)
  } else {
    throw new Error('Invalid argument: options')
  }
  // 如果传入回调函数
  if (callback) {
    if (typeof callback !== 'function') {
      throw new Error('Invalid argument: callback')
    }
    // 如果是监听模式，则初始化监听配置，最后返回compiler实例的监听方法
    if (
      options.watch === true ||
      (Array.isArray(options) && options.some(o => o.watch))
    ) {
      const watchOptions = Array.isArray(options)
        ? options.map(o => o.watchOptions || {})
        : options.watchOptions || {}
      return compiler.watch(watchOptions, callback)
    }
    // 使用compiler的run方法运行回调
    compiler.run(callback)
  }
  // 返回complier实例
  return compiler
}

exports = module.exports = webpack
exports.version = version

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter
webpack.WebpackOptionsApply = WebpackOptionsApply
webpack.Compiler = Compiler
webpack.MultiCompiler = MultiCompiler
webpack.NodeEnvironmentPlugin = NodeEnvironmentPlugin
// @ts-ignore Global @this directive is not supported
webpack.validate = validateSchema.bind(this, webpackOptionsSchema)
webpack.validateSchema = validateSchema
webpack.WebpackOptionsValidationError = WebpackOptionsValidationError

const exportPlugins = (obj, mappings) => {
  for (const name of Object.keys(mappings)) {
    Object.defineProperty(obj, name, {
      configurable: false,
      enumerable: true,
      get: mappings[name]
    })
  }
}

exportPlugins(exports, {
  AutomaticPrefetchPlugin: () => require('./AutomaticPrefetchPlugin'),
  BannerPlugin: () => require('./BannerPlugin'),
  CachePlugin: () => require('./CachePlugin'),
  ContextExclusionPlugin: () => require('./ContextExclusionPlugin'),
  ContextReplacementPlugin: () => require('./ContextReplacementPlugin'),
  DefinePlugin: () => require('./DefinePlugin'),
  Dependency: () => require('./Dependency'),
  DllPlugin: () => require('./DllPlugin'),
  DllReferencePlugin: () => require('./DllReferencePlugin'),
  EnvironmentPlugin: () => require('./EnvironmentPlugin'),
  EvalDevToolModulePlugin: () => require('./EvalDevToolModulePlugin'),
  EvalSourceMapDevToolPlugin: () => require('./EvalSourceMapDevToolPlugin'),
  ExtendedAPIPlugin: () => require('./ExtendedAPIPlugin'),
  ExternalsPlugin: () => require('./ExternalsPlugin'),
  HashedModuleIdsPlugin: () => require('./HashedModuleIdsPlugin'),
  HotModuleReplacementPlugin: () => require('./HotModuleReplacementPlugin'),
  IgnorePlugin: () => require('./IgnorePlugin'),
  LibraryTemplatePlugin: () => require('./LibraryTemplatePlugin'),
  LoaderOptionsPlugin: () => require('./LoaderOptionsPlugin'),
  LoaderTargetPlugin: () => require('./LoaderTargetPlugin'),
  MemoryOutputFileSystem: () => require('./MemoryOutputFileSystem'),
  Module: () => require('./Module'),
  ModuleFilenameHelpers: () => require('./ModuleFilenameHelpers'),
  NamedChunksPlugin: () => require('./NamedChunksPlugin'),
  NamedModulesPlugin: () => require('./NamedModulesPlugin'),
  NoEmitOnErrorsPlugin: () => require('./NoEmitOnErrorsPlugin'),
  NormalModuleReplacementPlugin: () =>
    require('./NormalModuleReplacementPlugin'),
  PrefetchPlugin: () => require('./PrefetchPlugin'),
  ProgressPlugin: () => require('./ProgressPlugin'),
  ProvidePlugin: () => require('./ProvidePlugin'),
  SetVarMainTemplatePlugin: () => require('./SetVarMainTemplatePlugin'),
  SingleEntryPlugin: () => require('./SingleEntryPlugin'),
  SourceMapDevToolPlugin: () => require('./SourceMapDevToolPlugin'),
  Stats: () => require('./Stats'),
  Template: () => require('./Template'),
  UmdMainTemplatePlugin: () => require('./UmdMainTemplatePlugin'),
  WatchIgnorePlugin: () => require('./WatchIgnorePlugin')
})
exportPlugins((exports.dependencies = {}), {
  DependencyReference: () => require('./dependencies/DependencyReference')
})
exportPlugins((exports.optimize = {}), {
  AggressiveMergingPlugin: () => require('./optimize/AggressiveMergingPlugin'),
  AggressiveSplittingPlugin: () =>
    require('./optimize/AggressiveSplittingPlugin'),
  ChunkModuleIdRangePlugin: () =>
    require('./optimize/ChunkModuleIdRangePlugin'),
  LimitChunkCountPlugin: () => require('./optimize/LimitChunkCountPlugin'),
  MinChunkSizePlugin: () => require('./optimize/MinChunkSizePlugin'),
  ModuleConcatenationPlugin: () =>
    require('./optimize/ModuleConcatenationPlugin'),
  OccurrenceOrderPlugin: () => require('./optimize/OccurrenceOrderPlugin'),
  OccurrenceModuleOrderPlugin: () =>
    require('./optimize/OccurrenceModuleOrderPlugin'),
  OccurrenceChunkOrderPlugin: () =>
    require('./optimize/OccurrenceChunkOrderPlugin'),
  RuntimeChunkPlugin: () => require('./optimize/RuntimeChunkPlugin'),
  SideEffectsFlagPlugin: () => require('./optimize/SideEffectsFlagPlugin'),
  SplitChunksPlugin: () => require('./optimize/SplitChunksPlugin')
})
exportPlugins((exports.web = {}), {
  FetchCompileWasmTemplatePlugin: () =>
    require('./web/FetchCompileWasmTemplatePlugin'),
  JsonpTemplatePlugin: () => require('./web/JsonpTemplatePlugin')
})
exportPlugins((exports.webworker = {}), {
  WebWorkerTemplatePlugin: () => require('./webworker/WebWorkerTemplatePlugin')
})
exportPlugins((exports.node = {}), {
  NodeTemplatePlugin: () => require('./node/NodeTemplatePlugin'),
  ReadFileCompileWasmTemplatePlugin: () =>
    require('./node/ReadFileCompileWasmTemplatePlugin')
})
exportPlugins((exports.debug = {}), {
  ProfilingPlugin: () => require('./debug/ProfilingPlugin')
})
exportPlugins((exports.util = {}), {
  createHash: () => require('./util/createHash')
})

const defineMissingPluginError = (namespace, pluginName, errorMessage) => {
  Object.defineProperty(namespace, pluginName, {
    configurable: false,
    enumerable: true,
    get() {
      throw new RemovedPluginError(errorMessage)
    }
  })
}

// TODO remove in webpack 5
defineMissingPluginError(
  exports.optimize,
  'UglifyJsPlugin',
  'webpack.optimize.UglifyJsPlugin has been removed, please use config.optimization.minimize instead.'
)

// TODO remove in webpack 5
defineMissingPluginError(
  exports.optimize,
  'CommonsChunkPlugin',
  'webpack.optimize.CommonsChunkPlugin has been removed, please use config.optimization.splitChunks instead.'
)
```

## Compiler

webpack 的编译按照下面的钩子调用顺序

- entry-option(初始化 option)
- run(开始编译)
- make(从 entry 开始递归的分析依赖，对每个依赖模块进行 build)
- before-resolve(对模块位置进行解析)
- build-module(开始构建某个模块)
- normal-module-loader(将 loader 加载完成的 module 进行编译，生成 AST 树)
- program(遍历 AST，当遇到 require 等一些调用表达式时，收集依赖)
- seal(所有依赖 build 完成，开始优化)
- emit(输出到 dist 目录)

|         钩子         |     钩子类型      |                                          描述                                           |
| :------------------: | :---------------: | :-------------------------------------------------------------------------------------: |
|     entryOption      |   SyncBailHook    |                           在 entry 配置项处理过之后，执行插件                           |
|     afterPlugins     |     SyncHook      |                              设置完初始插件之后，执行插件                               |
|    afterResolvers    |     SyncHook      |                            resolver 安装完成之后，执行插件。                            |
|     environment      |     SyncHook      |                           environment 准备好之后，执行插件。                            |
|   afterEnvironment   |     SyncHook      |                          environment 安装完成之后，执行插件。                           |
|      beforeRun       |  AsyncSeriesHook  |                         compiler.run() 执行之前，添加一个钩子。                         |
|         run          |  AsyncSeriesHook  |                    开始读取 records 之前，钩入(hook into) compiler。                    |
|       watchRun       |  AsyncSeriesHook  | 监听模式下，一个新的编译(compilation)触发之后，执行一个插件，但是是在实际编译开始之前。 |
| normalModuleFactory  |     SyncHook      |                        NormalModuleFactory 创建之后，执行插件。                         |
| contextModuleFactory |     SyncHook      |                        ContextModuleFactory 创建之后，执行插件。                        |
|    beforeCompile     |  AsyncSeriesHook  |                        编译(compilation)参数创建之后，执行插件。                        |
|       compile        |     SyncHook      |              一个新的编译(compilation)创建之后，钩入(hook into) compiler。              |
|   thisCompilation    |     SyncHook      |                触发 compilation 事件之前执行（查看下面的 compilation）。                |
|     compilation      |     SyncHook      |                          编译(compilation)创建之后，执行插件。                          |
|         make         | AsyncParallelHook |                   从 entry 开始递归分析依赖，准备对每个模块进行 build                   |
|     afterCompile     |  AsyncSeriesHook  |                                                                                         |
|      shouldEmit      |   SyncBailHook    |                                  此时返回 true/false。                                  |
|  needAdditionalPass  |   SyncBailHook    |                                                                                         |
|         emit         |  AsyncSeriesHook  |                              生成资源到 output 目录之前。                               |
|      afterEmit       |  AsyncSeriesHook  |                              生成资源到 output 目录之后。                               |
|         done         |     SyncHook      |                                 编译(compilation)完成。                                 |
|        failed        |     SyncHook      |                                 编译(compilation)失败。                                 |
|       invalid        |     SyncHook      |                                监听模式下，编译无效时。                                 |
|      watchClose      |     SyncHook      |                                     监听模式停止。                                      |

```js
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
'use strict'

const parseJson = require('json-parse-better-errors')
const asyncLib = require('neo-async')
const path = require('path')
const { Source } = require('webpack-sources')
const util = require('util')
const {
  Tapable,
  SyncHook,
  SyncBailHook,
  AsyncParallelHook,
  AsyncSeriesHook
} = require('tapable')

const Compilation = require('./Compilation')
const Stats = require('./Stats')
const Watching = require('./Watching')
const NormalModuleFactory = require('./NormalModuleFactory')
const ContextModuleFactory = require('./ContextModuleFactory')
const ResolverFactory = require('./ResolverFactory')

const RequestShortener = require('./RequestShortener')
const { makePathsRelative } = require('./util/identifier')
const ConcurrentCompilationError = require('./ConcurrentCompilationError')
const { Logger } = require('./logging/Logger')

/** @typedef {import("../declarations/WebpackOptions").Entry} Entry */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */

/**
 * @typedef {Object} CompilationParams
 * @property {NormalModuleFactory} normalModuleFactory
 * @property {ContextModuleFactory} contextModuleFactory
 * @property {Set<string>} compilationDependencies
 */

class Compiler extends Tapable {
  constructor(context) {
    super()
    this.hooks = {
      /** @type {SyncBailHook<Compilation>} */
      shouldEmit: new SyncBailHook(['compilation']),
      /** @type {AsyncSeriesHook<Stats>} */
      // 完成编译
      done: new AsyncSeriesHook(['stats']),
      /** @type {AsyncSeriesHook<>} */
      additionalPass: new AsyncSeriesHook([]),
      /** @type {AsyncSeriesHook<Compiler>} */
      // 	compiler.run() 开始
      beforeRun: new AsyncSeriesHook(['compiler']),
      /** @type {AsyncSeriesHook<Compiler>} */
      // 在读取记录之前
      run: new AsyncSeriesHook(['compiler']),
      /** @type {AsyncSeriesHook<Compilation>} */
      // 在生成资源并输出到目录之前
      emit: new AsyncSeriesHook(['compilation']),
      /** @type {AsyncSeriesHook<string, Buffer>} */
      assetEmitted: new AsyncSeriesHook(['file', 'content']),
      /** @type {AsyncSeriesHook<Compilation>} */
      // 在生成资源并输出到目录之后
      afterEmit: new AsyncSeriesHook(['compilation']),

      /** @type {SyncHook<Compilation, CompilationParams>} */
      // 在触发 compilation 事件之前
      thisCompilation: new SyncHook(['compilation', 'params']),
      /** @type {SyncHook<Compilation, CompilationParams>} */
      // compilation创建完成
      compilation: new SyncHook(['compilation', 'params']),
      /** @type {SyncHook<NormalModuleFactory>} */
      // 创建出一个 NormalModuleFactory 之后
      normalModuleFactory: new SyncHook(['normalModuleFactory']),
      /** @type {SyncHook<ContextModuleFactory>}  */
      // 创建出一个 ContextModuleFactory 之后
      contextModuleFactory: new SyncHook(['contextModulefactory']),

      /** @type {AsyncSeriesHook<CompilationParams>} */
      // compilation 的参数已创建
      beforeCompile: new AsyncSeriesHook(['params']),
      /** @type {SyncHook<CompilationParams>} */
      // 在创建新 compilation 之前
      compile: new SyncHook(['params']),
      /** @type {AsyncParallelHook<Compilation>} */
      // 从 entry 开始递归分析依赖，准备对每个模块进行 build
      make: new AsyncParallelHook(['compilation']),
      /** @type {AsyncSeriesHook<Compilation>} */
      afterCompile: new AsyncSeriesHook(['compilation']),

      /** @type {AsyncSeriesHook<Compiler>} */
      // 在开始编译之前，watch 之后
      watchRun: new AsyncSeriesHook(['compiler']),
      /** @type {SyncHook<Error>} */
      // 错误编译
      failed: new SyncHook(['error']),
      /** @type {SyncHook<string, string>} */
      // 在无效的 watch 编译之后
      invalid: new SyncHook(['filename', 'changeTime']),
      /** @type {SyncHook} */
      // 在停止 watch 编译之后
      watchClose: new SyncHook([]),

      /** @type {SyncBailHook<string, string, any[]>} */
      infrastructureLog: new SyncBailHook(['origin', 'type', 'args']),

      // TODO the following hooks are weirdly located here
      // TODO move them for webpack 5
      /** @type {SyncHook} */
      environment: new SyncHook([]),
      /** @type {SyncHook} */
      afterEnvironment: new SyncHook([]),
      /** @type {SyncHook<Compiler>} */
      afterPlugins: new SyncHook(['compiler']),
      /** @type {SyncHook<Compiler>} */
      afterResolvers: new SyncHook(['compiler']),
      /** @type {SyncBailHook<string, Entry>} */
      // 初始化option
      entryOption: new SyncBailHook(['context', 'entry'])
    }
    // TODO webpack 5 remove this
    this.hooks.infrastructurelog = this.hooks.infrastructureLog

    this._pluginCompat.tap('Compiler', options => {
      switch (options.name) {
        case 'additional-pass':
        case 'before-run':
        case 'run':
        case 'emit':
        case 'after-emit':
        case 'before-compile':
        case 'make':
        case 'after-compile':
        case 'watch-run':
          options.async = true
          break
      }
    })

    /** @type {string=} */
    this.name = undefined
    /** @type {Compilation=} */
    this.parentCompilation = undefined
    /** @type {string} */
    this.outputPath = ''

    this.outputFileSystem = null
    this.inputFileSystem = null

    /** @type {string|null} */
    this.recordsInputPath = null
    /** @type {string|null} */
    this.recordsOutputPath = null
    this.records = {}
    this.removedFiles = new Set()
    /** @type {Map<string, number>} */
    this.fileTimestamps = new Map()
    /** @type {Map<string, number>} */
    this.contextTimestamps = new Map()
    /** @type {ResolverFactory} */
    this.resolverFactory = new ResolverFactory()

    this.infrastructureLogger = undefined

    // TODO remove in webpack 5
    this.resolvers = {
      normal: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin('resolver normal', resolver => {
            resolver.plugin(hook, fn)
          })
        }, 'webpack: Using compiler.resolvers.normal is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver normal", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin('resolver normal', resolver => {
            resolver.apply(...args)
          })
        }, 'webpack: Using compiler.resolvers.normal is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver normal", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      },
      loader: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin('resolver loader', resolver => {
            resolver.plugin(hook, fn)
          })
        }, 'webpack: Using compiler.resolvers.loader is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver loader", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin('resolver loader', resolver => {
            resolver.apply(...args)
          })
        }, 'webpack: Using compiler.resolvers.loader is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver loader", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      },
      context: {
        plugins: util.deprecate((hook, fn) => {
          this.resolverFactory.plugin('resolver context', resolver => {
            resolver.plugin(hook, fn)
          })
        }, 'webpack: Using compiler.resolvers.context is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver context", resolver => {\n  resolver.plugin(/* … */);\n}); instead.'),
        apply: util.deprecate((...args) => {
          this.resolverFactory.plugin('resolver context', resolver => {
            resolver.apply(...args)
          })
        }, 'webpack: Using compiler.resolvers.context is deprecated.\n' + 'Use compiler.resolverFactory.plugin("resolver context", resolver => {\n  resolver.apply(/* … */);\n}); instead.')
      }
    }

    /** @type {WebpackOptions} */
    this.options = /** @type {WebpackOptions} */ ({})

    this.context = context

    this.requestShortener = new RequestShortener(context)

    /** @type {boolean} */
    this.running = false

    /** @type {boolean} */
    this.watchMode = false

    /** @private @type {WeakMap<Source, { sizeOnlySource: SizeOnlySource, writtenTo: Map<string, number> }>} */
    this._assetEmittingSourceCache = new WeakMap()
    /** @private @type {Map<string, number>} */
    this._assetEmittingWrittenFiles = new Map()
  }

  /**
   * @param {string | (function(): string)} name name of the logger, or function called once to get the logger name
   * @returns {Logger} a logger with that name
   */
  getInfrastructureLogger(name) {
    if (!name) {
      throw new TypeError(
        'Compiler.getInfrastructureLogger(name) called without a name'
      )
    }
    return new Logger((type, args) => {
      if (typeof name === 'function') {
        name = name()
        if (!name) {
          throw new TypeError(
            'Compiler.getInfrastructureLogger(name) called with a function not returning a name'
          )
        }
      }
      if (this.hooks.infrastructureLog.call(name, type, args) === undefined) {
        if (this.infrastructureLogger !== undefined) {
          this.infrastructureLogger(name, type, args)
        }
      }
    })
  }
  // 监听初始化
  watch(watchOptions, handler) {
    if (this.running) return handler(new ConcurrentCompilationError())

    this.running = true
    this.watchMode = true
    this.fileTimestamps = new Map()
    this.contextTimestamps = new Map()
    this.removedFiles = new Set()
    return new Watching(this, watchOptions, handler)
  }
  // 运行编译
  run(callback) {
    if (this.running) return callback(new ConcurrentCompilationError())

    const finalCallback = (err, stats) => {
      this.running = false

      if (err) {
        this.hooks.failed.call(err)
      }

      if (callback !== undefined) return callback(err, stats)
    }

    const startTime = Date.now()

    this.running = true

    const onCompiled = (err, compilation) => {
      if (err) return finalCallback(err)

      if (this.hooks.shouldEmit.call(compilation) === false) {
        const stats = new Stats(compilation)
        stats.startTime = startTime
        stats.endTime = Date.now()
        this.hooks.done.callAsync(stats, err => {
          if (err) return finalCallback(err)
          return finalCallback(null, stats)
        })
        return
      }

      this.emitAssets(compilation, err => {
        if (err) return finalCallback(err)

        if (compilation.hooks.needAdditionalPass.call()) {
          compilation.needAdditionalPass = true

          const stats = new Stats(compilation)
          stats.startTime = startTime
          stats.endTime = Date.now()
          this.hooks.done.callAsync(stats, err => {
            if (err) return finalCallback(err)

            this.hooks.additionalPass.callAsync(err => {
              if (err) return finalCallback(err)
              this.compile(onCompiled)
            })
          })
          return
        }

        this.emitRecords(err => {
          if (err) return finalCallback(err)

          const stats = new Stats(compilation)
          stats.startTime = startTime
          stats.endTime = Date.now()
          this.hooks.done.callAsync(stats, err => {
            if (err) return finalCallback(err)
            return finalCallback(null, stats)
          })
        })
      })
    }
    // NodeEnvironmentPlugin中添加的清理缓存
    this.hooks.beforeRun.callAsync(this, err => {
      if (err) return finalCallback(err)

      this.hooks.run.callAsync(this, err => {
        if (err) return finalCallback(err)

        this.readRecords(err => {
          if (err) return finalCallback(err)

          this.compile(onCompiled)
        })
      })
    })
  }
  // 作为子编译进程运行
  runAsChild(callback) {
    this.compile((err, compilation) => {
      if (err) return callback(err)

      this.parentCompilation.children.push(compilation)
      for (const { name, source, info } of compilation.getAssets()) {
        this.parentCompilation.emitAsset(name, source, info)
      }

      const entries = Array.from(
        compilation.entrypoints.values(),
        ep => ep.chunks
      ).reduce((array, chunks) => {
        return array.concat(chunks)
      }, [])

      return callback(null, entries, compilation)
    })
  }
  // 净化输入
  purgeInputFileSystem() {
    if (this.inputFileSystem && this.inputFileSystem.purge) {
      this.inputFileSystem.purge()
    }
  }
  // 发布资源
  emitAssets(compilation, callback) {
    let outputPath
    const emitFiles = err => {
      if (err) return callback(err)

      asyncLib.forEachLimit(
        compilation.getAssets(),
        15,
        ({ name: file, source }, callback) => {
          let targetFile = file
          const queryStringIdx = targetFile.indexOf('?')
          if (queryStringIdx >= 0) {
            targetFile = targetFile.substr(0, queryStringIdx)
          }

          const writeOut = err => {
            if (err) return callback(err)
            const targetPath = this.outputFileSystem.join(
              outputPath,
              targetFile
            )
            // TODO webpack 5 remove futureEmitAssets option and make it on by default
            if (this.options.output.futureEmitAssets) {
              // check if the target file has already been written by this Compiler
              const targetFileGeneration = this._assetEmittingWrittenFiles.get(
                targetPath
              )

              // create an cache entry for this Source if not already existing
              let cacheEntry = this._assetEmittingSourceCache.get(source)
              if (cacheEntry === undefined) {
                cacheEntry = {
                  sizeOnlySource: undefined,
                  writtenTo: new Map()
                }
                this._assetEmittingSourceCache.set(source, cacheEntry)
              }

              // if the target file has already been written
              if (targetFileGeneration !== undefined) {
                // check if the Source has been written to this target file
                const writtenGeneration = cacheEntry.writtenTo.get(targetPath)
                if (writtenGeneration === targetFileGeneration) {
                  // if yes, we skip writing the file
                  // as it's already there
                  // (we assume one doesn't remove files while the Compiler is running)

                  compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
                    size: cacheEntry.sizeOnlySource.size()
                  })

                  return callback()
                }
              }

              // TODO webpack 5: if info.immutable check if file already exists in output
              // skip emitting if it's already there

              // get the binary (Buffer) content from the Source
              /** @type {Buffer} */
              let content
              if (typeof source.buffer === 'function') {
                content = source.buffer()
              } else {
                const bufferOrString = source.source()
                if (Buffer.isBuffer(bufferOrString)) {
                  content = bufferOrString
                } else {
                  content = Buffer.from(bufferOrString, 'utf8')
                }
              }

              // Create a replacement resource which only allows to ask for size
              // This allows to GC all memory allocated by the Source
              // (expect when the Source is stored in any other cache)
              cacheEntry.sizeOnlySource = new SizeOnlySource(content.length)
              compilation.updateAsset(file, cacheEntry.sizeOnlySource, {
                size: content.length
              })

              // Write the file to output file system
              this.outputFileSystem.writeFile(targetPath, content, err => {
                if (err) return callback(err)

                // information marker that the asset has been emitted
                compilation.emittedAssets.add(file)

                // cache the information that the Source has been written to that location
                const newGeneration =
                  targetFileGeneration === undefined
                    ? 1
                    : targetFileGeneration + 1
                cacheEntry.writtenTo.set(targetPath, newGeneration)
                this._assetEmittingWrittenFiles.set(targetPath, newGeneration)
                this.hooks.assetEmitted.callAsync(file, content, callback)
              })
            } else {
              if (source.existsAt === targetPath) {
                source.emitted = false
                return callback()
              }
              let content = source.source()

              if (!Buffer.isBuffer(content)) {
                content = Buffer.from(content, 'utf8')
              }

              source.existsAt = targetPath
              source.emitted = true
              this.outputFileSystem.writeFile(targetPath, content, err => {
                if (err) return callback(err)
                this.hooks.assetEmitted.callAsync(file, content, callback)
              })
            }
          }

          if (targetFile.match(/\/|\\/)) {
            const dir = path.dirname(targetFile)
            this.outputFileSystem.mkdirp(
              this.outputFileSystem.join(outputPath, dir),
              writeOut
            )
          } else {
            writeOut()
          }
        },
        err => {
          if (err) return callback(err)

          this.hooks.afterEmit.callAsync(compilation, err => {
            if (err) return callback(err)

            return callback()
          })
        }
      )
    }

    this.hooks.emit.callAsync(compilation, err => {
      if (err) return callback(err)
      outputPath = compilation.getPath(this.outputPath)
      this.outputFileSystem.mkdirp(outputPath, emitFiles)
    })
  }
  // 发布记录
  emitRecords(callback) {
    if (!this.recordsOutputPath) return callback()
    const idx1 = this.recordsOutputPath.lastIndexOf('/')
    const idx2 = this.recordsOutputPath.lastIndexOf('\\')
    let recordsOutputPathDirectory = null
    if (idx1 > idx2) {
      recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1)
    } else if (idx1 < idx2) {
      recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2)
    }

    const writeFile = () => {
      this.outputFileSystem.writeFile(
        this.recordsOutputPath,
        JSON.stringify(this.records, undefined, 2),
        callback
      )
    }

    if (!recordsOutputPathDirectory) {
      return writeFile()
    }
    this.outputFileSystem.mkdirp(recordsOutputPathDirectory, err => {
      if (err) return callback(err)
      writeFile()
    })
  }
  // 读取记录
  readRecords(callback) {
    if (!this.recordsInputPath) {
      this.records = {}
      return callback()
    }
    this.inputFileSystem.stat(this.recordsInputPath, err => {
      // It doesn't exist
      // We can ignore this.
      if (err) return callback()

      this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
        if (err) return callback(err)

        try {
          this.records = parseJson(content.toString('utf-8'))
        } catch (e) {
          e.message = 'Cannot parse records: ' + e.message
          return callback(e)
        }

        return callback()
      })
    })
  }
  // 创建子编译器
  createChildCompiler(
    compilation,
    compilerName,
    compilerIndex,
    outputOptions,
    plugins
  ) {
    const childCompiler = new Compiler(this.context)
    if (Array.isArray(plugins)) {
      for (const plugin of plugins) {
        plugin.apply(childCompiler)
      }
    }
    for (const name in this.hooks) {
      if (
        ![
          'make',
          'compile',
          'emit',
          'afterEmit',
          'invalid',
          'done',
          'thisCompilation'
        ].includes(name)
      ) {
        if (childCompiler.hooks[name]) {
          childCompiler.hooks[name].taps = this.hooks[name].taps.slice()
        }
      }
    }
    childCompiler.name = compilerName
    childCompiler.outputPath = this.outputPath
    childCompiler.inputFileSystem = this.inputFileSystem
    childCompiler.outputFileSystem = null
    childCompiler.resolverFactory = this.resolverFactory
    childCompiler.fileTimestamps = this.fileTimestamps
    childCompiler.contextTimestamps = this.contextTimestamps

    const relativeCompilerName = makePathsRelative(this.context, compilerName)
    if (!this.records[relativeCompilerName]) {
      this.records[relativeCompilerName] = []
    }
    if (this.records[relativeCompilerName][compilerIndex]) {
      childCompiler.records = this.records[relativeCompilerName][compilerIndex]
    } else {
      this.records[relativeCompilerName].push((childCompiler.records = {}))
    }

    childCompiler.options = Object.create(this.options)
    childCompiler.options.output = Object.create(childCompiler.options.output)
    for (const name in outputOptions) {
      childCompiler.options.output[name] = outputOptions[name]
    }
    childCompiler.parentCompilation = compilation

    compilation.hooks.childCompiler.call(
      childCompiler,
      compilerName,
      compilerIndex
    )

    return childCompiler
  }
  // 是否子汇编
  isChild() {
    return !!this.parentCompilation
  }
  // 创建汇编实例
  createCompilation() {
    return new Compilation(this)
  }
  // 根据参数创建新的汇编实例
  newCompilation(params) {
    const compilation = this.createCompilation()
    compilation.fileTimestamps = this.fileTimestamps
    compilation.contextTimestamps = this.contextTimestamps
    compilation.name = this.name
    compilation.records = this.records
    compilation.compilationDependencies = params.compilationDependencies
    this.hooks.thisCompilation.call(compilation, params)
    this.hooks.compilation.call(compilation, params)
    return compilation
  }
  // 创建普通模块的工厂模式
  createNormalModuleFactory() {
    const normalModuleFactory = new NormalModuleFactory(
      this.options.context,
      this.resolverFactory,
      this.options.module || {}
    )
    this.hooks.normalModuleFactory.call(normalModuleFactory)
    return normalModuleFactory
  }
  // 创建上下文模块的工厂模式
  createContextModuleFactory() {
    const contextModuleFactory = new ContextModuleFactory(this.resolverFactory)
    this.hooks.contextModuleFactory.call(contextModuleFactory)
    return contextModuleFactory
  }
  // 获取一个新的汇编参数对象
  newCompilationParams() {
    const params = {
      normalModuleFactory: this.createNormalModuleFactory(),
      contextModuleFactory: this.createContextModuleFactory(),
      compilationDependencies: new Set()
    }
    return params
  }
  // 编译
  compile(callback) {
    const params = this.newCompilationParams()
    this.hooks.beforeCompile.callAsync(params, err => {
      if (err) return callback(err)

      this.hooks.compile.call(params)

      const compilation = this.newCompilation(params)

      this.hooks.make.callAsync(compilation, err => {
        if (err) return callback(err)

        compilation.finish(err => {
          if (err) return callback(err)

          compilation.seal(err => {
            if (err) return callback(err)

            this.hooks.afterCompile.callAsync(compilation, err => {
              if (err) return callback(err)

              return callback(null, compilation)
            })
          })
        })
      })
    })
  }
}

module.exports = Compiler

class SizeOnlySource extends Source {
  constructor(size) {
    super()
    this._size = size
  }

  _error() {
    return new Error(
      'Content and Map of this Source is no longer available (only size() is supported)'
    )
  }

  size() {
    return this._size
  }

  /**
   * @param {any} options options
   * @returns {string} the source
   */
  source(options) {
    throw this._error()
  }

  node() {
    throw this._error()
  }

  listMap() {
    throw this._error()
  }

  map() {
    throw this._error()
  }

  listNode() {
    throw this._error()
  }

  updateHash() {
    throw this._error()
  }
}
```

## Tapable

Tapable 是一个类似于 Node.js 的 EventEmitter 的库,主要用于控制钩子函数的发布于订阅,控制着 webpack 的插件系统

Tapable 库暴露了很多 Hook(钩子)类,为插件提供挂载的钩子

|         模式          |       描述       |
| :-------------------: | :--------------: |
|       SyncHook        |       钩子       |
|     SyncBailHook      |   同步熔断钩子   |
|   SyncWaterfallHook   |   同步流水钩子   |
|     SyncLoopHook      |   同步循环钩子   |
|   AsyncParallelHook   |   异步并发钩子   |
| AsyncParallelBailHook | 异步并发熔断钩子 |
|    AsyncSeriesHook    |   异步串行钩子   |
|  AsyncSeriesBailHook  | 异步串行熔断钩子 |
| AsyncSeriesWaterHook  | 异步串行流水钩子 |

Tapable hooks 类型

|     模式      |                            描述                            |
| :-----------: | :--------------------------------------------------------: |
|     Hook      |                        所有钩子后缀                        |
|   Waterfall   |              同步方法,但是它会传给下一个函数               |
|     Bail      |        熔断:当函数有返回值时,就会在当前执行函数停止        |
|     Loop      | 监听函数返回 true 表示继续循环,返回 undefined 表示结束循环 |
|     Sync      |                          同步方法                          |
|  AsyncSeries  |                        异步串行钩子                        |
| AsyncParallel |                      异步并行执行钩子                      |

### 原理

订阅发布模式

例如 SyncHook 类，SyncHook 继承 Hook 类,但是发布核心 call 来自 HookCodeFactory，以下简单实现一个 SyncHook 类

```js
class SyncHook extends Hook {
  compile (options) {
    let factory = new HookCodeFactory()
    factory.setup(this, options)
    return factory.create(options)
  }
}
class Hook {
  constructor () {
    this.taps = [] // 存放每一个订阅tap对象
    this._args = [] // 存放回调的传参数量
    this.call = this._call // 执行回调函数
    this._x = undefined // 在HookCodeFactory类中使用,存放tap回调函								数,类型taps
  }
  // 初始化options,调用_insert方法放入taps
  tap (options, fn) {
    options = { name: options, type: 'sync', fn }
    this._insert(options)
  }
  // 放入taps
  _insert (item) {
    let i = this.taps.length
    this.taps[i] = item
  }
  _call () {
    this.compile({
      taps: this.taps,
      args: this._args,
      type: 'sync'
    })()
  }
}
class HookCodeFactory {
  constructor () {
    this.options = undefined
    this._args = undefined
  }
  setup (instance, options) {
    instance._x = options.map(t => t.fn)
  }
  create (options) {
    this.options = options
    this._args = options.args
    let fn = new Function(this._args, this.content())
    this.options = undefined
    this._args = options.args
    return fn
  }
  content () {
    let code = ''
    for (var i = 0; i < this.options.taps.length; i++) {
      code += `var _fn${i} = _x[${i}];\n`
      code += `_fn${i}(${...this._args})`
    }
    return code
  }
}


```
