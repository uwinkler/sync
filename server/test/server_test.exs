defmodule ServerTest do
  use ExUnit.Case
  doctest Server

  test "greets the world" do
    assert Server.hello() == :oops
  end
end
