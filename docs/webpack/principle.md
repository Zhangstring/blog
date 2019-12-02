# 原理

## webpack本质

webpack可以理解为基于事件流的编程范例，一系列的插件运行


## webpack.js

`webpack`在命令行中运行该命令，npm会让命令行工具进入`node_modules/.bin`目录中查找webpack.js文件，并执行该文件。实际上文件的入口`node_modules/webpack/bin/webpack.js`

- 判断webpack-cli和webpack-common是否有安装
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
## webpack-cli

在webpack.js中执行了`webpack-cli/bin/cli.js`文件

- 处理不需要编译的命令，NON_COMPILATION_CMD分析不需要编译的命令
  1. 如果命令在NON_COMPILATION_ARGS中，则不进行编译，执行文件`webpack-cli/bin/utils/prompt-command.js`
  2. 在prompt-command文件中查询是否安装该命名的包，没有则去安装提示，有则执行该包
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

- 调用命令行工具包yargs动态生成help帮助参数，提供命令和分组参数
  
  参数的分组（config/config-args.js），将命令划分为9类
  1. Config options:配置相关参数(文件名称、运行环境等)
	2. Basic options:基础参数(entry设置、debug模式设置、watch监听设置、devtool设置)
	3. Module options:模块参数,给loader设置扩展
	4. Output options:输出参数(输出路径、输出文件名称)
	5. Advanced options:高级用法(记录设置、缓存设置、监听频率、bail等)
	6. Resolving options:解析参数(alias和解析的文件后缀设置)
	7. Optimizing options:优化参数
	8. Stats options:统计参数
	9. options:通用参数(帮助命令、版本信息等)
- 对配置文件和命令行参数进行转化最终生成配置选项参数options
- 根据配置参数实例化webpack对象，然后执行构建流程

```js
// based on https://github.com/webpack/webpack/blob/master/bin/webpack.js

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

const npmGlobalRoot = () => {
	const cp = require("child_process");
	return new Promise((resolve, reject) => {
		const command = cp.spawn("npm", ["root", "-g"]);
		command.on("error", error => reject(error));
		command.stdout.on("data", data => resolve(data.toString()));
		command.stderr.on("data", data => reject(data));
	});
};

const runWhenInstalled = (packages, pathForCmd, ...args) => {
	const currentPackage = require(pathForCmd);
	const func = currentPackage.default;
	if (typeof func !== "function") {
		throw new Error(`@webpack-cli/${packages} failed to export a default function`);
	}
	return func(...args);
};

module.exports = function promptForInstallation(packages, ...args) {
	const nameOfPackage = "@webpack-cli/" + packages;
	let packageIsInstalled = false;
	let pathForCmd;
	try {
		const path = require("path");
		const fs = require("fs");
		pathForCmd = path.resolve(process.cwd(), "node_modules", "@webpack-cli", packages);
		if (!fs.existsSync(pathForCmd)) {
			const globalModules = require("global-modules");
			pathForCmd = globalModules + "/@webpack-cli/" + packages;
			require.resolve(pathForCmd);
		} else {
			require.resolve(pathForCmd);
		}
		packageIsInstalled = true;
	} catch (err) {
		packageIsInstalled = false;
	}
	if (!packageIsInstalled) {
		const path = require("path");
		const fs = require("fs");
		const readLine = require("readline");
		const isYarn = fs.existsSync(path.resolve(process.cwd(), "yarn.lock"));

		const packageManager = isYarn ? "yarn" : "npm";
		const options = ["install", "-D", nameOfPackage];

		if (isYarn) {
			options[0] = "add";
		}

		if (packages === "init") {
			if (isYarn) {
				options.splice(1, 1); // remove '-D'
				options.splice(0, 0, "global");
			} else {
				options[1] = "-g";
			}
		}

		const commandToBeRun = `${packageManager} ${options.join(" ")}`;

		const question = `Would you like to install ${packages}? (That will run ${commandToBeRun}) (yes/NO) : `;

		console.error(`The command moved into a separate package: ${nameOfPackage}`);
		const questionInterface = readLine.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		questionInterface.question(question, answer => {
			questionInterface.close();
			switch (answer.toLowerCase()) {
				case "y":
				case "yes":
				case "1": {
					runCommand(packageManager, options)
						.then(_ => {
							if (packages === "init") {
								npmGlobalRoot()
									.then(root => {
										const pathtoInit = path.resolve(root.trim(), "@webpack-cli", "init");
										return pathtoInit;
									})
									.then(pathForInit => {
										return require(pathForInit).default(...args);
									})
									.catch(error => {
										console.error(error);
										process.exitCode = 1;
									});
								return;
							}

							pathForCmd = path.resolve(process.cwd(), "node_modules", "@webpack-cli", packages);
							return runWhenInstalled(packages, pathForCmd, ...args);
						})
						.catch(error => {
							console.error(error);
							process.exitCode = 1;
						});
					break;
				}
				default: {
					console.error(`${nameOfPackage} needs to be installed in order to run the command.`);
					process.exitCode = 1;
					break;
				}
			}
		});
	} else {
		return runWhenInstalled(packages, pathForCmd, ...args);
	}
};

```